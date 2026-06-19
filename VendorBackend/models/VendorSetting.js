const mongoose = require("mongoose");

const vendorSettingSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    company: String,

    emailNotifications: {
      type: Boolean,
      default: true,
    },

    smsNotifications: {
      type: Boolean,
      default: false,
    },

    payoutAccount: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VendorSetting",
  vendorSettingSchema
);