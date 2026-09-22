// routes/auth.routes.js - COMPLETE WITH ALL ROUTES

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Vendor = require("../models/Vendor");
const Company = require("../models/Company");

const router = express.Router();
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../middleware/emailService");
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const vendor = await Vendor.findOne({ email });

    // Security: same response (email exist or not)
    if (!vendor) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    vendor.resetPasswordToken = resetToken;
    vendor.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await vendor.save();

    // Send branded Native91 email
    const result = await sendPasswordResetEmail(vendor.email, vendor.name, resetToken);

    if (!result.success) {
      console.warn("⚠️ Email failed but token saved:", result.error);
      // In dev mode, return link so you can test
      return res.json({
        success: true,
        message: "Reset link generated. (Email failed — check server logs)",
        devLink: process.env.NODE_ENV !== "production" ? result.link : undefined,
      });
    }

    res.json({
      success: true,
      message: "Password reset link has been sent to your email.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process request",
    });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const vendor = await Vendor.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    vendor.password = hashedPassword;
    vendor.resetPasswordToken = undefined;
    vendor.resetPasswordExpires = undefined;
    vendor.passwordLastChanged = new Date();
    await vendor.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to reset password",
    });
  }
});

// ============================================================
// ✅ VERIFY RESET TOKEN  👈 આ route missing હતું!
// ============================================================
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    console.log("🔍 Verifying token:", token);

    const vendor = await Vendor.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!vendor) {
      console.log("❌ Token not found or expired");
      return res.status(400).json({
        valid: false,
        message: "Invalid or expired reset token",
      });
    }

    console.log("✅ Token valid for:", vendor.email);

    res.json({
      valid: true,
      email: vendor.email,
      name: vendor.name,
    });
  } catch (err) {
    console.error("Verify token error:", err);
    res.status(500).json({
      valid: false,
      message: "Failed to verify token",
    });
  }
});
// ============================================================
// ✅ VENDOR LOGIN WITH STATUS CHECK
// ============================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // CHECK STATUS
    if (vendor.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact admin.",
        status: 'suspended',
        reason: vendor.suspensionReason || "No reason provided",
        suspendedAt: vendor.suspendedAt
      });
    }

    if (vendor.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact admin.",
        status: 'inactive'
      });
    }

    if (vendor.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval.",
        status: 'pending'
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
        name: vendor.name,
        email: vendor.email,
        status: vendor.status
      },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "7d" }
    );

    const statusHistory = (vendor.statusHistory || [])
      .slice(-5)
      .reverse()
      .map(entry => ({
        status: entry.status,
        previousStatus: entry.previousStatus,
        changedBy: entry.changedByName || 'System',
        reason: entry.reason,
        timestamp: entry.timestamp
      }));

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
        status: vendor.status,
        plan: vendor.plan,
        planName: vendor.planName,
        commissionRate: vendor.commissionRate,
        statusHistory: statusHistory,
        suspendedAt: vendor.suspendedAt,
        suspensionReason: vendor.suspensionReason,
        reactivatedAt: vendor.reactivatedAt,
        totalOrders: vendor.totalOrders || 0,
        statusChangeCount: vendor.statusChangeCount || 0,
        createdAt: vendor.createdAt
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Login failed. Please try again."
    });
  }
});

// ============================================================
// ✅ GET VENDOR PROFILE WITH STATUS - ADD THIS ROUTE
// ============================================================
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const vendor = await Vendor.findById(decoded.id).select("-password");
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    const statusHistory = (vendor.statusHistory || [])
      .slice(-5)
      .reverse()
      .map(entry => ({
        status: entry.status,
        previousStatus: entry.previousStatus,
        changedBy: entry.changedByName || 'System',
        reason: entry.reason,
        timestamp: entry.timestamp
      }));

    res.json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        company: vendor.company,
        status: vendor.status,
        plan: vendor.plan,
        planName: vendor.planName,
        commissionRate: vendor.commissionRate,
        statusHistory: statusHistory,
        suspendedAt: vendor.suspendedAt,
        suspensionReason: vendor.suspensionReason,
        reactivatedAt: vendor.reactivatedAt,
        totalOrders: vendor.totalOrders || 0,
        statusChangeCount: vendor.statusChangeCount || 0,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt
      }
    });

  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch profile"
    });
  }
});

// ============================================================
// ✅ CHECK VENDOR STATUS (Lightweight endpoint)
// ============================================================
router.get("/status", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const vendor = await Vendor.findById(decoded.id).select("status suspendedAt suspensionReason reactivatedAt statusHistory");
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    res.json({
      success: true,
      status: vendor.status,
      isSuspended: vendor.status === 'suspended',
      isActive: vendor.status === 'active',
      isPending: vendor.status === 'pending',
      isInactive: vendor.status === 'inactive',
      suspendedAt: vendor.suspendedAt,
      suspensionReason: vendor.suspensionReason,
      reactivatedAt: vendor.reactivatedAt,
      recentStatusChanges: (vendor.statusHistory || [])
        .slice(-3)
        .reverse()
        .map(entry => ({
          status: entry.status,
          changedBy: entry.changedByName || 'System',
          reason: entry.reason,
          timestamp: entry.timestamp
        }))
    });

  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to check status"
    });
  }
});

// ============================================================
// ✅ LOGOUT
// ============================================================
router.post("/logout", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// ✅ REFRESH TOKEN
// ============================================================
router.post("/refresh-token", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const vendor = await Vendor.findById(decoded.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    if (vendor.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
        status: 'suspended',
        reason: vendor.suspensionReason
      });
    }

    const newToken = jwt.sign(
      {
        id: vendor._id,
        company: vendor.company,
        role: "vendor",
        name: vendor.name,
        email: vendor.email,
        status: vendor.status
      },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to refresh token"
    });
  }
});

module.exports = router;
