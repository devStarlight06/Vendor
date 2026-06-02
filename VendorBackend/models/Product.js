// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: String,
  image: [{ type: String }],
  company: { type: String, required: true },
  // commission_rate: { type: Number, min: 0, max: 100 }, // Comment this out if not needed
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);