const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Vendor = require("../models/Vendor");
const VendorSetting = require("../models/VendorSetting");
const auth = require("../middleware/auth");

// Get Settings
// Get settings with status info
router.get("/", auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    let settings = await VendorSetting.findOne({ vendorId: req.user.id });
    if (!settings) {
      settings = await VendorSetting.create({
        vendorId: req.user.id,
        company: req.user.company,
      });
    }

    res.json({
      success: true,
      settings,
      // ✅ ADD THIS - Include vendor status
      vendorStatus: {
        status: vendor.status,
        suspendedAt: vendor.suspendedAt,
        suspensionReason: vendor.suspensionReason,
        statusHistory: vendor.statusHistory?.slice(-5) || [],
        isSuspended: vendor.status === 'suspended'
      }
    });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Update Settings
router.put("/", auth, async (req, res) => {
  try {
    const settings = await VendorSetting.findOneAndUpdate(
      {
        vendorId: req.user.id,
      },
      req.body,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// CHANGE PASSWORD ROUTE
// ============================================================
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Find vendor
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    vendor.password = hashedPassword;
    vendor.passwordLastChanged = new Date();
    vendor.resetPasswordToken = undefined;
    vendor.resetPasswordExpires = undefined;
    await vendor.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to change password",
    });
  }
});

// ============================================================
// FORGOT PASSWORD ROUTE (Request Reset)
// ============================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const vendor = await Vendor.findOne({ email, role: 'vendor' });
    if (!vendor) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: "If a vendor account exists, a reset link will be sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    vendor.resetPasswordToken = resetToken;
    vendor.resetPasswordExpires = resetTokenExpiry;
    await vendor.save();

    // Send email (you can add email service here)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    console.log(`🔐 Reset link for ${vendor.email}: ${resetUrl}`);

    res.json({
      success: true,
      message: "Password reset link sent to your email",
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process request",
    });
  }
});

// ============================================================
// RESET PASSWORD WITH TOKEN
// ============================================================
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

    // Hash and save new password
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
// VERIFY RESET TOKEN
// ============================================================
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const vendor = await Vendor.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!vendor) {
      return res.status(400).json({
        valid: false,
        message: "Invalid or expired reset token",
      });
    }

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

module.exports = router;