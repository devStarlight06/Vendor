// models/Product.js
const mongoose = require("mongoose");

// 🆕 VARIANT SUB-SCHEMA
const variantSchema = new mongoose.Schema({
  color: { type: String, default: "" },
  size: { type: String, default: "" },
  image: { type: String, default: "" },
  stock: { type: Number, default: 0, min: 0 },
  isAvailable: { type: Boolean, default: true },
  price: { type: Number, default: 0 }
}, { _id: true });

// 🆕 Clean subcategory strings
const cleanSubcategory = (s) => {
  if (!s || typeof s !== "string") return "";
  let cleaned = s.trim();
  let prev = null;
  let iter = 0;
  while (cleaned !== prev && iter < 15) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/^[\s\[\]"'\\\/]+/, "")
      .replace(/[\s\[\]"'\\\/]+$/, "")
      .trim();
    iter++;
  }
  cleaned = cleaned.replace(/\\+/g, "").trim();
  return cleaned.length > 0 && cleaned.length < 100 ? cleaned : "";
};

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: "" },
  category: { type: String, required: true },

  categories: { type: [String], default: [] },
  categorySubcategoryMap: { type: Map, of: [String], default: {} },

  subcategory: { type: String, default: "" },
  subcategories: { type: [String], default: [] },

  image: [{ type: String }],
  company: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  commission_rate: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  variants: { type: [variantSchema], default: [] },

  size: { type: String, default: "" },
  weight: { type: Number, default: 0 },
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
  variant: { type: String, default: "" },
  sku: { type: String, default: "" },
  shippingTime: {
    type: String,
    enum: ['1-2 days', '2-3 days', '3-4 days', '3-5 days', '5-7 days',
          '7-10 days', '10-15 days', '15-30 days', 'Custom'],
    default: '3-5 days'
  },
  customShippingTime: { type: String, default: '' },
  estimatedDeliveryDays: {
    min: { type: Number, default: 3 },
    max: { type: Number, default: 5 }
  },
  shippingCharge: { type: Number, default: 0 },
  isFreeShipping: { type: Boolean, default: true },
  ingredients: { type: String, default: "" },
  ingredientsList: { type: [String], default: [] },
  nutritionalInfo: {
    servingSize: { type: String, default: "" },
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbohydrates: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 }
  },
  allergens: { type: [String], default: [] },
  dietaryInfo: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isDairyFree: { type: Boolean, default: false },
    isNutFree: { type: Boolean, default: false },
    isOrganic: { type: Boolean, default: false }
  },

  // 🆕 CUSTOM FIELD
// models/Product.js (vendor backend) — customField section
// 🆕 CUSTOM FIELD — vendor enables + names the field; customer types the value
customField: {
  enabled: { type: Boolean, default: false },
  label:   { type: String,  default: "" }   // e.g., "Name to Print"
}
}, { timestamps: true });

// ✅ PRE-SAVE cleanup — only touch subcategory/subcategories
productSchema.pre("save", function () {
  const doc = this;
  let subCats = [];

  if (Array.isArray(doc.subcategories) && doc.subcategories.length > 0) {
    subCats = doc.subcategories;
  } else if (doc.subcategory) {
    subCats = [doc.subcategory];
  }

  const cleaned = [];
  const seen = new Set();
  subCats.forEach(s => {
    const val = cleanSubcategory(s);
    if (!val) return;
    const key = val.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(val);
  });

  doc.subcategories = cleaned;
  doc.subcategory = cleaned[0] || "";
});

// ✅ PRE-FIND-ONE-UPDATE cleanup — SAFE: only touches subcategory/subcategories
// ✅ FIX: normalizes plain update into $set so customField and other fields pass through untouched
productSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (!update) return;

  // Normalize so we always operate on $set
  if (!update.$set) {
    this.setUpdate({ $set: update });
  }
  const target = this.getUpdate().$set || this.getUpdate();

  // Only touch subcategories if the caller explicitly sent them
  const hasSubs = Object.prototype.hasOwnProperty.call(target, "subcategories");
  const hasSub  = Object.prototype.hasOwnProperty.call(target, "subcategory");

  if (hasSubs || hasSub) {
    let subCats = [];
    if (Array.isArray(target.subcategories) && target.subcategories.length > 0) {
      subCats = target.subcategories;
    } else if (target.subcategory) {
      subCats = [target.subcategory];
    }

    const cleaned = [];
    const seen = new Set();
    subCats.forEach(s => {
      const val = cleanSubcategory(s);
      if (!val) return;
      const key = val.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      cleaned.push(val);
    });

    target.subcategories = cleaned;
    target.subcategory = cleaned[0] || "";
  }

  // Remove legacy fields
  delete target.subCategories;
  delete target.subCategory;
});

module.exports = mongoose.model("Product", productSchema);