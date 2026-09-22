// routes/vendor.js (અથવા settingsRoutes.js)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Vendor = require("../models/Vendor");
const VendorSetting = require("../models/VendorSetting");
const SellerDocument = require("../models/SellerDocument");
const Company = require("../models/Company");
const auth = require("../middleware/auth");

// ============================================================
// MULTER CONFIGURATION FOR LOGO UPLOAD (Vendor)
// ============================================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `vendor-logo-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// ============================================================
// GET SETTINGS (with logo - Admin priority, Vendor fallback)
// ============================================================
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
        company: vendor.company || req.user.company,
      });
    }

    // ========================================================
    // 1. VENDOR LOGO (from VendorSetting)
    // ========================================================
    let vendorLogo = settings.logo || null;

    // If vendor setting has no logo, check SellerDocument
    if (!vendorLogo) {
      const doc = await SellerDocument.findOne({
        email: vendor.email,
        status: {
          $in: ['verified', 'submitted', 'pending_review', 'partially_rejected']
        }
      });

      if (doc && doc.logo && doc.logo.image) {
        vendorLogo = doc.logo.image;
        // Save ONLY vendor logo to settings
        settings.logo = vendorLogo;
        await settings.save();
        console.log(`✅ Vendor logo synced from SellerDocument for ${vendor.email}`);
      }
    }

    // ========================================================
    // 2. ADMIN LOGO (from Company model)
    // ========================================================
    const company = await Company.findOne({ name: vendor.company });
    const adminLogo = company?.logo || null;

    // ========================================================
    // 3. PRIORITY: Admin Logo > Vendor Logo
    // ========================================================
    const finalLogo = adminLogo || vendorLogo || null;
    const logoSource = adminLogo ? 'admin' : (vendorLogo ? 'vendor' : 'none');

    // ========================================================
    // 4. BUILD CORRECT URL BASED ON SOURCE
    // ========================================================
    const vendorBaseUrl = process.env.VENDOR_BASE_URL || 'http://localhost:5177';
    const adminBaseUrl = process.env.ADMIN_BASE_URL || 'http://localhost:7001';

    let fullLogoUrl = null;

    if (finalLogo) {
      // Admin logo (starts with /images)
      if (finalLogo.startsWith('/images')) {
        fullLogoUrl = `${adminBaseUrl}${finalLogo}`;
      }
      // Vendor logo (starts with /uploads)
      else if (finalLogo.startsWith('/uploads')) {
        fullLogoUrl = `${vendorBaseUrl}${finalLogo}`;
      }
      // Already full URL
      else if (finalLogo.startsWith('http://') || finalLogo.startsWith('https://')) {
        fullLogoUrl = finalLogo;
      }
      // Other relative path
      else {
        fullLogoUrl = `${vendorBaseUrl}/${finalLogo.replace(/^\/+/, '')}`;
      }
    }

    console.log('=================================');
    console.log('Vendor:', vendor.email);
    console.log('Admin Logo:', adminLogo);
    console.log('Vendor Logo:', vendorLogo);
    console.log('Final Logo:', finalLogo);
    console.log('Logo Source:', logoSource);
    console.log('Final URL:', fullLogoUrl);
    console.log('=================================');

    res.json({
      success: true,
      settings: {
        ...settings.toObject(),
        // ✅ Full URL for display
        logo: fullLogoUrl,
        // ✅ Original path (for frontend normalization)
        logoPath: finalLogo,
        // ✅ Source: 'admin' or 'vendor' or 'none'
        logoSource: logoSource,
        // ✅ Debug info
        adminLogo: adminLogo,
        vendorLogo: vendorLogo
      },
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

// ============================================================
// UPDATE SETTINGS
// ============================================================
router.put("/", auth, async (req, res) => {
  try {
    const settings = await VendorSetting.findOneAndUpdate(
      { vendorId: req.user.id },
      req.body,
      { new: true, upsert: true, runValidators: true }
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
// UPLOAD LOGO - Vendor (Updates ONLY VendorSetting + SellerDocument)
// ============================================================
router.post("/logo", auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file uploaded"
      });
    }

    // ✅ Vendor logo path (starts with /uploads)
    const logoPath = `/uploads/logos/${req.file.filename}`;
    const vendorBaseUrl = process.env.VENDOR_BASE_URL || 'http://localhost:5177';
    const fullLogoUrl = `${vendorBaseUrl}${logoPath}`;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    // 1. ✅ Update VendorSetting (ONLY vendor logo)
    const existingSettings = await VendorSetting.findOne({ vendorId: req.user.id });
    if (existingSettings && existingSettings.logo) {
      const oldLogoPath = path.join(__dirname, '..', existingSettings.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    const settings = await VendorSetting.findOneAndUpdate(
      { vendorId: req.user.id },
      { logo: logoPath },
      { new: true, upsert: true }
    );
    console.log(`✅ Vendor logo updated in VendorSetting for ${vendor.email}`);

    // 2. ✅ Update SellerDocument
    try {
      const doc = await SellerDocument.findOne({ 
        email: vendor.email,
        status: { $in: ['verified', 'submitted', 'pending_review', 'partially_rejected'] }
      });
      
      if (doc) {
        if (doc.logo && doc.logo.image && doc.logo.image !== logoPath) {
          const oldDocLogoPath = path.join(__dirname, '..', doc.logo.image);
          if (fs.existsSync(oldDocLogoPath)) {
            fs.unlinkSync(oldDocLogoPath);
          }
        }
        
        doc.logo = {
          image: logoPath,
          status: doc.logo?.status || 'verified',
          rejectionReason: doc.logo?.rejectionReason || '',
          resubmittedAt: doc.logo?.resubmittedAt || null
        };
        await doc.save();
        console.log(`✅ Logo updated in SellerDocument for ${vendor.email}`);
      }
    } catch (docErr) {
      console.warn("⚠️ Could not update SellerDocument:", docErr.message);
    }

    // 3. ✅ DO NOT update Company model (Admin logo is separate)

    res.json({
      success: true,
      message: "Vendor logo uploaded successfully",
      logoUrl: fullLogoUrl,
      logoPath: logoPath,
      logoSource: 'vendor',
      settings
    });
  } catch (err) {
    console.error("Logo upload error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// DELETE LOGO - Vendor (Deletes ONLY vendor logo)
// ============================================================
router.delete("/logo", auth, async (req, res) => {
  try {
    const settings = await VendorSetting.findOne({ vendorId: req.user.id });
    
    if (!settings || !settings.logo) {
      return res.status(404).json({
        success: false,
        message: "No vendor logo found to delete"
      });
    }

    // ✅ Only delete if it's a vendor logo (starts with /uploads)
    if (!settings.logo.startsWith('/uploads')) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin logo from vendor settings"
      });
    }

    const vendor = await Vendor.findById(req.user.id);
    const logoPathToDelete = settings.logo;

    // Delete from VendorSetting
    settings.logo = null;
    await settings.save();

    // Delete from SellerDocument
    try {
      if (vendor) {
        const doc = await SellerDocument.findOne({ email: vendor.email });
        if (doc && doc.logo && doc.logo.image) {
          doc.logo.image = '';
          await doc.save();
        }
      }
    } catch (docErr) {
      console.warn("⚠️ Could not remove from SellerDocument:", docErr.message);
    }

    // Delete physical file
    const logoPath = path.join(__dirname, '..', logoPathToDelete);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
      console.log(`✅ Vendor logo file deleted: ${logoPath}`);
    }

    res.json({
      success: true,
      message: "Vendor logo deleted successfully",
      settings
    });
  } catch (err) {
    console.error("Logo delete error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// CHANGE PASSWORD ROUTE
// ============================================================
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

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
      return res.status(200).json({
        success: true,
        message: "If a vendor account exists, a reset link will be sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;

    vendor.resetPasswordToken = resetToken;
    vendor.resetPasswordExpires = resetTokenExpiry;
    await vendor.save();

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