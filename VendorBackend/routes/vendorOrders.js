// routes/vendorOrders.js - COMPLETE FIXED VERSION WITH ORDER CREATION
const express = require("express");
const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();
const checkVendorStatus = async (req, res, next) => {
  const vendor = await Vendor.findById(req.user.id);
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });
  
  // ✅ ADD THIS
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
// ✅ CREATE ORDER - ADD THIS ROUTE (MISSING)
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

      // ✅ Get vendor from product
      const vendor = await Vendor.findById(product.vendorId);

      processedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image && product.image.length > 0 ? product.image[0] : null,
        company: vendor ? vendor.company : product.company || "Unknown",
        vendorId: vendor ? vendor._id : null, // ✅ CRITICAL: Save vendorId
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
// GET VENDOR ORDERS WITH COMMISSION
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
          createdAt: order.createdAt,
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