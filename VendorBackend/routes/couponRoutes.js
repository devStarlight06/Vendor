// routes/coupons.js (COMPLETE FIXED VERSION)
const express = require("express");
const router = express.Router();

const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const checkVendorStatus = async () => {
  try {
    // ✅ Use /status endpoint instead of /profile
    const res = await axios.get(`${API_URL}/auth/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = res.data;
    if (data && data.isSuspended) {
      setSuspensionInfo({
        isSuspended: true,
        reason: data.suspensionReason || 'No reason provided',
        suspendedAt: data.suspendedAt
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Status check error:", err.message);
    return false;
  }
};

router.get("/public/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    console.log(`=== Fetching coupons for product: ${productId} ===`);

    const product = await Product.findById(productId);
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log(`Product company: ${product.company}`);

    const coupons = await Coupon.find({
      company: product.company,
      $or: [
        { active: true },
        { isActive: true }
      ],
      expiryDate: { $gte: new Date() }
    }).sort({ createdAt: -1 });

    console.log(`Found ${coupons.length} total coupons for company ${product.company}`);

    const validCoupons = coupons.filter(coupon => {
      const productList = coupon.products || coupon.productIds || [];
      
      if (productList.length === 0) {
        return true;
      }
      
      return productList.some(id => id.toString() === productId);
    });

    console.log(`Returning ${validCoupons.length} valid coupons`);

    res.json({
      success: true,
      coupons: validCoupons.map(coupon => ({
        _id: coupon._id,
        code: coupon.code,
        discount: coupon.discount || coupon.discountValue || 0,
        type: coupon.type || coupon.discountType || 'percentage',
        company: coupon.company,
        expiryDate: coupon.expiryDate,
        active: coupon.active || coupon.isActive || true,
        products: coupon.products || coupon.productIds || [],
        description: coupon.description || `${coupon.type === 'percentage' ? coupon.discount + '%' : '₹' + coupon.discount} off`
      }))
    });

  } catch (err) {
    console.error("Error fetching product coupons:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons"
    });
  }
});

// Get coupons for a company (Public)
router.get("/public/company/:companyName", async (req, res) => {
  try {
    const { companyName } = req.params;
    const { productId } = req.query;

    console.log(`Fetching coupons for company: ${companyName}`);

    const query = {
      company: companyName,
      $or: [
        { active: true },
        { isActive: true }
      ],
      expiryDate: { $gte: new Date() }
    };

    let coupons = await Coupon.find(query).sort({ createdAt: -1 });

    if (productId) {
      coupons = coupons.filter(coupon => {
        const productList = coupon.products || coupon.productIds || [];
        if (productList.length === 0) return true;
        return productList.some(id => id.toString() === productId);
      });
    }

    console.log(`Found ${coupons.length} coupons`);

    res.json({
      success: true,
      coupons: coupons.map(coupon => ({
        _id: coupon._id,
        code: coupon.code,
        discount: coupon.discount || coupon.discountValue || 0,
        type: coupon.type || coupon.discountType || 'percentage',
        company: coupon.company,
        expiryDate: coupon.expiryDate,
        active: coupon.active || coupon.isActive || true,
        products: coupon.products || coupon.productIds || [],
        description: coupon.description || `${coupon.type === 'percentage' ? coupon.discount + '%' : '₹' + coupon.discount} off`
      }))
    });

  } catch (err) {
    console.error("Error fetching company coupons:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons"
    });
  }
});

// Get all active coupons (Public)
router.get("/public/all", async (req, res) => {
  try {
    const coupons = await Coupon.find({
      $or: [
        { active: true },
        { isActive: true }
      ],
      expiryDate: { $gte: new Date() }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      coupons: coupons.map(coupon => ({
        _id: coupon._id,
        code: coupon.code,
        discount: coupon.discount || coupon.discountValue || 0,
        type: coupon.type || coupon.discountType || 'percentage',
        company: coupon.company,
        expiryDate: coupon.expiryDate,
        active: coupon.active || coupon.isActive || true,
        products: coupon.products || coupon.productIds || [],
        description: coupon.description || `${coupon.type === 'percentage' ? coupon.discount + '%' : '₹' + coupon.discount} off`
      }))
    });

  } catch (err) {
    console.error("Error fetching all coupons:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons"
    });
  }
});

// ============================================================
// VENDOR ROUTES (Authentication required)
// ============================================================

// ✅ CREATE COUPON
router.post("/", auth, async (req, res) => {
  console.log("===== CREATE COUPON API HIT =====");

  try {
    console.log("User:", req.user);
    console.log("Body:", req.body);

    const {
      code,
      discount,
      type,
      products,
      expiryDate,
      minOrderAmount,
      maxDiscount,
      description,
      usageLimit,
      active
    } = req.body;

    // Validate products if any are selected
    if (products && products.length > 0) {
      console.log(`Validating ${products.length} products for company: ${req.user.company}`);
      
      const vendorProducts = await Product.find({
        _id: { $in: products },
        company: req.user.company,
      });

      console.log(`Found ${vendorProducts.length} valid products`);
      
      if (vendorProducts.length !== products.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid products selected. Some products don't belong to your company.",
        });
      }
    }

    const couponData = {
      code: code.toUpperCase(),
      discount: parseFloat(discount),
      discountValue: parseFloat(discount),
      type: type || 'percentage',
      discountType: type || 'percentage',
      products: products || [],
      productIds: products || [],
      expiryDate: new Date(expiryDate),
      company: req.user.company,
      vendorName: req.user.company,
      active: active !== undefined ? active : true,
      isActive: active !== undefined ? active : true,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxDiscount: parseFloat(maxDiscount) || 0,
      description: description || '',
      usageLimit: parseInt(usageLimit) || 0,
      usedCount: 0
    };

    console.log("Creating coupon with data:", couponData);

    const coupon = await Coupon.create(couponData);

    console.log("✅ Coupon Created Successfully:", coupon);

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });

  } catch (err) {
    console.error("CREATE COUPON ERROR:");
    console.error(err);
    console.error(err.stack);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// ✅ GET VENDOR COUPONS - MUST BE BEFORE /:id
// ============================================================
router.get("/", auth, async (req, res) => {
  try {
    console.log(`Fetching coupons for vendor: ${req.user.company}`);
    
    const coupons = await Coupon.find({
      company: req.user.company,
    }).populate("products", "name price image");

    console.log(`Found ${coupons.length} coupons`);

    res.json({
      success: true,
      coupons: coupons,
    });
  } catch (err) {
    console.error("Error fetching vendor coupons:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// ✅ GET SINGLE COUPON - PARAMETER ROUTE (MUST COME AFTER SPECIFIC ROUTES)
// ============================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      _id: req.params.id,
      company: req.user.company,
    }).populate("products", "name price image");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      coupon,
    });
  } catch (err) {
    console.error("Error fetching single coupon:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// ✅ UPDATE COUPON
// ============================================================
router.put("/:id", auth, async (req, res) => {
  try {
    console.log("===== UPDATE COUPON =====");
    console.log("Body:", req.body);

    const {
      code,
      discount,
      type,
      products,
      expiryDate,
      minOrderAmount,
      maxDiscount,
      description,
      usageLimit,
      active
    } = req.body;

    // Validate products if any are selected
    if (products && products.length > 0) {
      const vendorProducts = await Product.find({
        _id: { $in: products },
        company: req.user.company,
      });

      if (vendorProducts.length !== products.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid products selected",
        });
      }
    }

    const updateData = {
      code: code.toUpperCase(),
      discount: parseFloat(discount),
      discountValue: parseFloat(discount),
      type: type || 'percentage',
      discountType: type || 'percentage',
      products: products || [],
      productIds: products || [],
      expiryDate: new Date(expiryDate),
      active: active !== undefined ? active : true,
      isActive: active !== undefined ? active : true,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxDiscount: parseFloat(maxDiscount) || 0,
      description: description || '',
      usageLimit: parseInt(usageLimit) || 0
    };

    console.log("Updating coupon with data:", updateData);

    const coupon = await Coupon.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      updateData,
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    console.log("✅ Coupon updated:", coupon);

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (err) {
    console.error("Update coupon error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// ✅ DELETE COUPON
// ============================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (err) {
    console.error("Delete coupon error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// ✅ VALIDATE COUPON (for checkout)
// ============================================================
router.post("/validate", auth, async (req, res) => {
  try {
    const { code, productId, totalAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required"
      });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      company: req.user.company,
      $or: [
        { active: true },
        { isActive: true }
      ],
      expiryDate: { $gte: new Date() }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired coupon code"
      });
    }

    // Check usage limit
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit has been reached"
      });
    }

    // Check if coupon applies to this product
    if (productId && coupon.products && coupon.products.length > 0) {
      const productIds = coupon.products.map(p => p._id || p);
      if (!productIds.some(id => id.toString() === productId.toString())) {
        return res.status(400).json({
          success: false,
          message: "Coupon does not apply to this product"
        });
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount > 0 && totalAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (totalAmount * coupon.discount) / 100;
      if (coupon.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = Math.min(coupon.discount, totalAmount);
    }

    res.json({
      success: true,
      valid: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discount: coupon.discount,
        type: coupon.type,
        discountAmount: discountAmount.toFixed(2),
        description: coupon.description
      }
    });

  } catch (err) {
    console.error("Validate coupon error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;