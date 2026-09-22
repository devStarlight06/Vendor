const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        name: String,           // Fallback name
        company: String,        // 🆕 Vendor company
        vendorId: {             // 🆕 Vendor ID (for security)
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vendor",
          default: null,
        },
      },
    ],
    shippingAddress: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    totalPrice: Number,

    // ============================================================
    // ✅ ORDER STATUS (expanded enum)
    // ============================================================
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },

    // ============================================================
    // 🆕 STATUS UPDATE TRACKING
    // ============================================================
    statusUpdatedAt: {
      type: Date,
      default: null,
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    // ============================================================
    // 🆕 STATUS HISTORY (audit log)
    // ============================================================
    statusHistory: [
      {
        status: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vendor",
        },
        updatedByName: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================================
    // 🆕 ORDER META
    // ============================================================
    paymentMethod: {
      type: String,
      default: "online",
    },
    guestId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);