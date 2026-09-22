// models/VendorSetting.js
const mongoose = require("mongoose");

// Check if model already exists to prevent OverwriteModelError
const vendorSettingSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    unique: true
  },
  company: {
    type: String,
    default: ''
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: false
  },
  payoutAccount: {
    type: String,
    default: ''
  },
  // ✅ LOGO FIELD - This will be the source of truth for logo
  logo: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps on save
vendorSettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ✅ Check if model exists before creating
const VendorSetting = mongoose.models.VendorSetting || mongoose.model("VendorSetting", vendorSettingSchema);

module.exports = VendorSetting;