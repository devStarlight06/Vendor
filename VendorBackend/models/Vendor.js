// models/Vendor.js - COMPLETE UPDATED
const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: { 
    type: String, 
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["vendor"],
    default: "vendor"
  },
  phone: {
    type: String,
    default: ""
  },
  company: {
    type: String,
    default: ""
  },
  plan: {
    type: String,
    enum: ['founding', 'growth', 'premium'],
    default: 'founding'
  },
  planName: {
    type: String,
    default: 'Founding 100'
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  planUpdatedAt: {
    type: Date,
    default: Date.now
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  resetPasswordToken: {
    type: String,
    default: undefined,
    index: true
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined
  },
  passwordLastChanged: {
    type: Date,
    default: undefined
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("Vendor", VendorSchema);