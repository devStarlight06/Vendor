const express = require("express");
const router = express.Router();

const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const auth = require("../middleware/auth");


// Create Coupon
router.post("/", auth, async (req, res) => {
  try {
    const {
      code,
      discount,
      type,
      products,
      expiryDate,
    } = req.body;

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

    const coupon = await Coupon.create({
      code,
      discount,
      type,
      products,
      expiryDate,
      company: req.user.company,
    });

    res.status(201).json({
      success: true,
      coupon,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// Get Vendor Coupons
router.get("/", auth, async (req, res) => {
  try {
    const coupons = await Coupon.find({
      company: req.user.company,
    }).populate("products", "name price");

    res.json({
      success: true,
      coupons,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// Get Single Coupon
router.get("/:id", auth, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      _id: req.params.id,
      company: req.user.company,
    }).populate("products");

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
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// Update Coupon
router.put("/:id", auth, async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      req.body,
      { new: true }
    );

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
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// Delete Coupon
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
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;