// middleware/auth.js
const jwt = require("jsonwebtoken");
const Vendor = require("../models/Vendor");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const vendor = await Vendor.findById(decoded.id);
    if (!vendor) return res.status(401).json({ message: "Invalid token" });

    req.user = {
      id: vendor._id,
      company: vendor.company,  // Make sure company is included
      name: vendor.name,
      email: vendor.email,
      role: "vendor"
    };
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};