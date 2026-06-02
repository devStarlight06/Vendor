const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true 
  },
  image: { 
    type: String,
    default: null
  },
  description: { 
    type: String, 
    default: "" 
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("Category", categorySchema);