const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ["vendor"],
    
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return this.role === "vendor";
    }
  },
  phone: String,
   company: String
});

module.exports = mongoose.model("Vendor", VendorSchema);
