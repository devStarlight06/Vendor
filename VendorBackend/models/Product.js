// models/Product.js - WITH SIZE/WEIGHT ATTRIBUTES
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

  // ✅ NEW: Size/Weight Attributes
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
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);