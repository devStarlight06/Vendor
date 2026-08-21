// models/Product.js - ADD THUMBNAIL FIELDS
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    default: "" 
  },
  category: { 
    type: String, 
    required: true 
  },
  image: [{ 
    type: String 
  }],
  company: { 
    type: String, 
    required: true 
  },
  
  // ✅ Link to vendor
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor',
    required: true 
  },
  
  // ✅ Commission rate
  commission_rate: { 
    type: Number, 
    default: 0 
  },
  
  stock: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },

  // ✅ Size/Weight Attributes
  size: {
    type: String,
    default: ""
  },
  weight: {
    type: Number,
    default: 0
  },
  weightUnit: {
    type: String,
    enum: ['g', 'kg', 'ml', 'L', 'oz', 'lb', 'piece', 'pack', 'box', ''],
    default: ''
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, enum: ['cm', 'in', 'mm', ''], default: 'cm' }
  },
  variant: {
    type: String,
    default: ""
  },
  sku: {
    type: String,
    default: ""
  },

  // ✅ THUMBNAIL FIELDS (ADD THESE)
  thumbnail_url: {
    type: String,
    default: null
  },
  thumbnail_status: {
    type: String,
    enum: ['NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'NOT_STARTED'
  },
  thumbnail_generated_at: {
    type: Date,
    default: null
  },
  thumbnail_retry_count: {
    type: Number,
    default: 0
  },
  original_image_hash: {
    type: String,
    default: null
  },
  thumbnail_error: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);