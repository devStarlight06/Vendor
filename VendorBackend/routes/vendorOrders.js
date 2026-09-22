// routes/vendorOrders.js - COMPLETE WITH STATUS UPDATE

const express = require("express");
const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

const checkVendorStatus = async (req, res, next) => {
  const vendor = await Vendor.findById(req.user.id);
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });

  if (vendor.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: "Your account is suspended. Cannot create orders.",
      status: 'suspended'
    });
  }

  next();
};

// ============================================================
// HELPER: Get commission rate from vendor plan
// ============================================================
const getCommissionRate = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) return 8;

  if (vendor.commissionRate !== undefined && vendor.commissionRate !== null) {
    return vendor.commissionRate;
  }

  const COMMISSION_MAP = {
    'founding': 0,
    'growth': 8,
    'premium': 3
  };

  if (vendor.plan === 'founding') {
    const now = new Date();
    const threeMonthsLater = new Date(vendor.planUpdatedAt || vendor.createdAt);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const isOfferActive = now <= threeMonthsLater || (vendor.totalOrders || 0) < 10;
    return isOfferActive ? 0 : 10;
  }

  return COMMISSION_MAP[vendor.plan] || 8;
};

// ============================================================
// ✅ VALID ORDER STATUSES
// ============================================================
const VALID_STATUSES = [
  "Pending",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

// ============================================================
// ✅ CREATE ORDER
// ============================================================
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in order",
      });
    }

    const processedItems = [];
    let totalPrice = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      const vendor = await Vendor.findById(product.vendorId);

      processedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image && product.image.length > 0 ? product.image[0] : null,
        company: vendor ? vendor.company : product.company || "Unknown",
        vendorId: vendor ? vendor._id : null,
      });

      totalPrice += product.price * item.quantity;
    }

    const order = new Order({
      guestId: req.user.id || req.body.guestId,
      items: processedItems,
      shippingAddress,
      paymentMethod: paymentMethod || "online",
      totalPrice,
      orderStatus: "Pending",
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// ✅ GET VENDOR ORDERS WITH COMMISSION
// ============================================================
router.get("/my-orders", auth, async (req, res) => {
  try {
    const commissionRate = await getCommissionRate(req.user.id);

    const orders = await Order.find()
      .populate({
        path: "items.productId",
        match: { company: new RegExp(`^${req.user.company}$`, "i") },
        select: "name price company vendorId",
      })
      .sort({ createdAt: -1 });

    const filteredOrders = orders
      .map(order => {
        const vendorItems = order.items.filter(i => i.productId);

        const itemsWithCommission = vendorItems.map(item => {
          const itemTotal = (item.price || 0) * (item.quantity || 0);
          const commission = itemTotal * (commissionRate / 100);
          return {
            ...item.toObject(),
            itemTotal,
            commission,
            vendorEarning: itemTotal - commission
          };
        });

        return {
          _id: order._id,
          shippingAddress: order.shippingAddress,
          orderStatus: order.orderStatus,
          statusHistory: order.statusHistory || [],
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: itemsWithCommission,
          totalPrice: order.totalPrice,
          commissionSummary: {
            rate: commissionRate,
            totalCommission: itemsWithCommission.reduce((sum, i) => sum + i.commission, 0),
            totalVendorEarning: itemsWithCommission.reduce((sum, i) => sum + i.vendorEarning, 0)
          }
        };
      })
      .filter(order => order.items.length > 0);

    res.json({
      orders: filteredOrders,
      commissionRate,
      plan: req.user.plan || 'founding'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// 🆕 ✅ UPDATE ORDER STATUS (Vendor only)
// PATCH /api/orders/:orderId/status
// ============================================================
router.patch("/:orderId/status", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // ✅ Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ✅ Security: vendor પોતાના order જ update કરી શકે
    const vendorId = req.user.id.toString();
    const orderVendorIds = (order.items || [])
      .map((item) => item.vendorId?.toString())
      .filter(Boolean);

    // જો vendorId ના મળે, તો company name થી match કરો (backward compatibility)
    if (!orderVendorIds.includes(vendorId)) {
      // Fallback: company match
      const vendor = await Vendor.findById(req.user.id);
      const hasCompanyMatch = (order.items || []).some(
        (item) =>
          item.company &&
          vendor?.company &&
          item.company.toLowerCase() === vendor.company.toLowerCase()
      );

      if (!hasCompanyMatch) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this order",
        });
      }
    }

    // ✅ Update status + metadata
    order.orderStatus = status;
    order.statusUpdatedAt = new Date();
    order.statusUpdatedBy = req.user.id;

    // ✅ Add to status history
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status,
      updatedBy: req.user.id,
      updatedByName: req.user.name || "Vendor",
      timestamp: new Date(),
    });

    await order.save();

    console.log(`✅ Order ${orderId} status updated to "${status}" by vendor ${req.user.id}`);

    res.json({
      success: true,
      message: `Order status updated to "${status}"`,
      order: {
        _id: order._id,
        orderStatus: order.orderStatus,
        statusUpdatedAt: order.statusUpdatedAt,
        statusHistory: order.statusHistory,
      },
    });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update order status",
    });
  }
});

// ============================================================
// GET VENDOR EARNINGS WITH PLAN-BASED COMMISSION
// ============================================================
router.get("/my-earnings", auth, async (req, res) => {
  try {
    const commissionRate = await getCommissionRate(req.user.id);

    const orders = await Order.find({ orderStatus: "Delivered" })
      .populate({
        path: "items.productId",
        match: { company: new RegExp(`^${req.user.company}$`, "i") },
        select: "name category price company vendorId",
      })
      .sort({ createdAt: -1 });

    const earningsData = [];
    let totalSales = 0;
    let totalCommission = 0;
    let totalVendorPayout = 0;

    orders.forEach(order => {
      const vendorItems = order.items.filter(i => i.productId);

      vendorItems.forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        const commission = itemTotal * (commissionRate / 100);
        const vendorPayout = itemTotal - commission;

        totalSales += itemTotal;
        totalCommission += commission;
        totalVendorPayout += vendorPayout;

        earningsData.push({
          orderId: order._id,
          productName: item.productId.name || item.name,
          category: item.productId.category || "General",
          totalSales: itemTotal,
          commissionRate: commissionRate,
          adminCommission: commission,
          vendorPayout: vendorPayout,
          date: order.createdAt,
          orderStatus: order.orderStatus
        });
      });
    });

    res.json({
      earnings: earningsData,
      summary: {
        totalSales,
        totalCommission,
        totalVendorPayout,
        commissionRate,
        plan: req.user.plan || 'founding'
      }
    });
  } catch (err) {
    console.error("Earnings Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET MY CUSTOMERS
// ============================================================
router.get("/my-customers", auth, async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: "Delivered" })
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