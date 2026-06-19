const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    discount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },

    company: {
      type: String,
      required: true,
    },

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    expiryDate: {
      type: Date,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);