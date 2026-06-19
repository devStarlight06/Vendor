const express = require("express");
const router = express.Router();

const Review = require("../models/Review");
const auth = require("../middleware/auth");

// Vendor Reviews
router.get("/", auth, async (req, res) => {
  try {
    const reviews = await Review.find({
      company: req.user.company,
    })
      .populate("productId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Delete Review
router.delete("/:id", auth, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Review deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;