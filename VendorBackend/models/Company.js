const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: String,
  description: String,
  logo: String
});

module.exports = mongoose.model("Company", companySchema);
