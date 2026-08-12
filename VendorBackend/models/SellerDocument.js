const mongoose = require("mongoose");

const sellerDocumentSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  company: {
    type: String,
    required: true
  },
  

  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
 
  aadhaar: {
    number: { type: String, default: "" },
    frontImage: { type: String, default: "" },
    backImage: { type: String, default: "" },
    verified: { type: Boolean, default: false }
  },
  

  pan: {
    number: { type: String, default: "" },
    image: { type: String, default: "" },
    verified: { type: Boolean, default: false }
  },

  gst: {
    number: { type: String, default: "" },
    certificate: { type: String, default: "" },
    verified: { type: Boolean, default: false }
  },
  

  bank: {
    accountHolderName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    confirmAccountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    bankName: { type: String, default: "" },
    branchName: { type: String, default: "" },
    upiId: { type: String, default: "" },
    verified: { type: Boolean, default: false }
  },
  

  contact: {
    phone: { type: String, default: "" },
    alternatePhone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" }
  },
  
  
  business: {
    registrationType: { 
      type: String, 
      enum: ['sole_proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'other', ''], 
      default: '' 
    },
    registrationNumber: { type: String, default: "" },
    certificate: { type: String, default: "" },
    verified: { type: Boolean, default: false }
  },
  

  status: {
    type: String,
    enum: ['draft', 'submitted', 'verified', 'rejected'],
    default: 'draft'
  },
  
  submissionDate: {
    type: Date
  },
  
  verificationDate: {
    type: Date
  },
  
  rejectionReason: {
    type: String,
    default: ""
  },
  
  lastSaved: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });


sellerDocumentSchema.index({ email: 1, trackingId: 1 });

module.exports = mongoose.model("SellerDocument", sellerDocumentSchema);