const mongoose = require("mongoose");

const vendorSettingSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true
    },
    company: {
      type: String,
      default: ""
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    payoutAccount: {
      type: String,
      default: ""
    },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("VendorSetting", vendorSettingSchema);