const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // Support both field names
  discountValue: {
    type: Number,
    required: false
  },
  discount: {
    type: Number,
    required: false
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: false
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: false
  },
  // Support both field names
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  company: {
    type: String,
    required: true
  },
  vendorName: {
    type: String
  },
  // Support both field names
  isActive: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  usageLimit: {
    type: Number,
    default: 0
  },
  usedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to sync fields
couponSchema.pre("save", async function () {
  // Sync discount and discountValue
  if (this.discount !== undefined && this.discountValue === undefined) {
    this.discountValue = this.discount;
  }
  if (this.discountValue !== undefined && this.discount === undefined) {
    this.discount = this.discountValue;
  }

  // Sync type and discountType
  if (this.type !== undefined && this.discountType === undefined) {
    this.discountType = this.type;
  }
  if (this.discountType !== undefined && this.type === undefined) {
    this.type = this.discountType;
  }

  // Sync active and isActive
  if (this.active !== undefined && this.isActive === undefined) {
    this.isActive = this.active;
  }
  if (this.isActive !== undefined && this.active === undefined) {
    this.active = this.isActive;
  }

  // Sync products and productIds
  if (this.products && this.products.length > 0 && (!this.productIds || this.productIds.length === 0)) {
    this.productIds = this.products;
  }
  if (this.productIds && this.productIds.length > 0 && (!this.products || this.products.length === 0)) {
    this.products = this.productIds;
  }
});

module.exports = mongoose.model('Coupon', couponSchema);