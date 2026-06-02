const express = require("express");
const Order = require("../models/Order");
const auth = require("../middleware/auth");

const router = express.Router();

/* ============================================
   GET VENDOR ORDERS (COMPANY FILTERED)
============================================ */
router.get("/my-orders", auth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "items.productId",
        match: { company: new RegExp(`^${req.user.company}$`, "i") },
        select: "name price company",
      })
      .sort({ createdAt: -1 });

    const filteredOrders = orders
      .map(order => {
        // Only keep items belonging to this vendor
        const vendorItems = order.items.filter(i => i.productId);

        return {
          _id: order._id,
          shippingAddress: order.shippingAddress, // This must exist in the Schema!
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          items: vendorItems,
          totalPrice: order.totalPrice,
        };
      })
      // Only send orders that actually have products for this vendor
      .filter(order => order.items.length > 0);

    res.json(filteredOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
router.get("/my-earnings", auth, async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "Delivered" }) // 👈 KEY LINE
      .populate({
        path: "items.productId",
        match: { company: new RegExp(`^${req.user.company}$`, "i") },
        select: "name category price company",
      })
      .sort({ createdAt: -1 });

    const earningsData = [];

    orders.forEach(order => {
      const vendorItems = order.items.filter(i => i.productId);

      vendorItems.forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        const commission = itemTotal * 0.05;
        const vendorPayout = itemTotal - commission;

        earningsData.push({
          orderId: order._id,
          productName: item.productId.name || item.name,
          category: item.productId.category || "General",
          totalSales: itemTotal,
          adminCommission: commission,
          vendorPayout,
          date: order.createdAt,
          orderStatus: order.orderStatus
        });
      });
    });

    res.json(earningsData);
  } catch (err) {
    console.error("Earnings Error:", err);
    res.status(500).json({ message: err.message });
  }
});
router.get("/my-customers", auth, async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "Delivered" }) // optional but recommended
      .populate({
        path: "items.productId",
        match: { company: new RegExp(`^${req.user.company}$`, "i") },
        select: "company",
      });

    const customerMap = {};

    orders.forEach(order => {
      const vendorItems = order.items.filter(i => i.productId);

      if (vendorItems.length === 0) return;

      const customer = order.shippingAddress;
      if (!customer || !customer.email) return;

      if (!customerMap[customer.email]) {
        customerMap[customer.email] = {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          orders: 0,
          spend: 0,
        };
      }

      customerMap[customer.email].orders += 1;

      vendorItems.forEach(item => {
        customerMap[customer.email].spend +=
          (item.price || 0) * (item.quantity || 0);
      });
    });

    // Convert object → array and format currency
    const customers = Object.values(customerMap).map(c => ({
      ...c,
      spend: `₹${c.spend.toLocaleString("en-IN")}`,
    }));

    res.json(customers);
  } catch (err) {
    console.error("Customer Fetch Error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
