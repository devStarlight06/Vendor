const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    company: {
      type: String,
      required: true,
    },

    customerName: String,

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    comment: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);