const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "danger"],
      default: "info",
    },
    link: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
notificationSchema.index({ company: 1, createdAt: -1 });
notificationSchema.index({ company: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);