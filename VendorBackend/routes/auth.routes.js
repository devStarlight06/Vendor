// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// const Vendor = require("../models/Vendor");
// const Company = require("../Models/Company");

// const router = express.Router();


// // ✅ VENDOR REGISTER
// router.post("/register", async (req, res) => {
//   try {
//     const { name, email, password, phone, company } = req.body;

//     // company required
//     if (!company) {
//       return res.status(400).json({
//         message: "Company is required",
//       });
//     }

//     // check company exists
//     const companyExists = await Company.findOne({
//       name: company,
//     });

//     if (!companyExists) {
//       return res.status(400).json({
//         message: "Selected company does not exist",
//       });
//     }

//     // email exists
//     const exists = await Vendor.findOne({ email });

//     if (exists) {
//       return res.status(400).json({
//         message: "Email already exists",
//       });
//     }

//     // hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // create vendor
//     const vendor = await Vendor.create({
//       name,
//       email,
//       password: hashedPassword,
//       phone,
//       company,
//     });

//     res.status(201).json({
//       message: "Vendor registered successfully",
//       vendor,
//     });

//   } catch (err) {
//     res.status(500).json({
//       message: err.message,
//     });
//   }
// });


// // ✅ VENDOR LOGIN
// // In auth.routes.js - Login route
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const vendor = await Vendor.findOne({ email });
//     if (!vendor) {
//       return res.status(400).json({ message: "Invalid email or password" });
//     }

//     const companyExists = await Company.findOne({ name: vendor.company });
//     if (!companyExists) {
//       return res.status(400).json({ message: "Company does not exist anymore" });
//     }

//     const isMatch = await bcrypt.compare(password, vendor.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid email or password" });
//     }

//     // Create token with company included
//     const token = jwt.sign(
//       {
//         id: vendor._id,
//         company: vendor.company,  // ✅ IMPORTANT: Include company in token
//         role: "vendor",
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE }
//     );

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       vendor: {
//         id: vendor._id,
//         name: vendor.name,
//         email: vendor.email,
//         company: vendor.company,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Vendor = require("../models/Vendor");
const Company = require("../Models/Company");

const router = express.Router();

// ✅ VENDOR LOGIN ONLY (Registration disabled)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    const companyExists = await Company.findOne({ name: vendor.company });
    if (!companyExists) {
      return res.status(400).json({ 
        success: false,
        message: "Company does not exist anymore" 
      });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    const token = jwt.sign(
      {
        id: vendor._id,
        company: vendor.company,
        role: "vendor",
        name: vendor.name
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        company: vendor.company,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ✅ GET VENDOR PROFILE
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "No token provided" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const vendor = await Vendor.findById(decoded.id).select("-password");
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        message: "Vendor not found" 
      });
    }

    res.json({
      success: true,
      vendor
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

module.exports = router;