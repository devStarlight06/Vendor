// sellerDocument.routes.js - WITH MULTIPLE CATEGORY SUPPORT

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const SellerDocument = require("../models/SellerDocument");
const Vendor = require("../models/Vendor");
const Company = require("../models/Company");

const { 
  sendDocumentLinkEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendVendorCreationEmail,
  sendDocumentRejectionEmail,
  sendDocumentResubmissionEmail
} = require("../middleware/emailService");

const generateTrackingId = () => {
  return 'DOC-' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

// ============================================================
// ✅ SEND ADMIN NOTIFICATION EMAIL FOR NEW DOCUMENT
// ============================================================
const sendAdminDocumentNotification = async (documentData) => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@native91.com";
  
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || "brands@native91.com",
      pass: process.env.EMAIL_PASS || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Native91" <${process.env.EMAIL_USER || "brands@native91.com"}>`,
    to: adminEmail,
    subject: `📋 New Document Upload - ${documentData.company}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Document Upload</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f2; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #073f31; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: #e5d6a5; margin: 0; font-family: Georgia, serif; font-weight: normal; }
    .content { padding: 25px; }
    .field { margin-bottom: 12px; }
    .label { font-weight: bold; color: #073f31; font-size: 13px; }
    .value { font-size: 15px; color: #333; margin-top: 2px; padding: 8px 12px; background: #f9fafb; border-radius: 5px; }
    .status-badge { display: inline-block; background: #f39c12; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .button { display: inline-block; background: #073f31; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✦ Native91</h1>
      <p style="color: white; margin: 5px 0 0; font-size: 14px;">New Document Upload</p>
    </div>
    
    <div class="content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #073f31;">${documentData.company}</h2>
        <span class="status-badge">DRAFT</span>
      </div>
      
      <div class="field">
        <div class="label">📧 Email Address</div>
        <div class="value">${documentData.email}</div>
      </div>
      
      <div class="field">
        <div class="label">🏷️ Company / Business Name</div>
        <div class="value">${documentData.company}</div>
      </div>
      
      <div class="field">
        <div class="label">🆔 Tracking ID</div>
        <div class="value">${documentData.trackingId}</div>
      </div>
      
      <div class="field">
        <div class="label">📅 Created At</div>
        <div class="value">${new Date(documentData.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
      </div>
      
      <hr style="margin: 20px 0; border-color: #eee;">
      
      <div style="text-align: center;">
        <a href="${process.env.ADMIN_URL || 'https://admin.native91.com'}/vendor-documents" class="button">
          View Documents →
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated notification. Please review the documents in the admin panel.</p>
      <p>&copy; ${new Date().getFullYear()} Native91. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// ============================================================
// ✅ CORS MIDDLEWARE FOR ALL ROUTES
// ============================================================
router.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://www.native91.com",
    "https://native91.com",
    "https://vendor.native91.com",
    "https://api-admin.native91.com",
    "https://api-vendor.native91.com",
    "https://admin.native91.com"
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// ============================================================
// MULTER SETUP
// ============================================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../uploads/documents");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const field = req.body.field || 'document';
    cb(null, `${field}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: fileFilter
});

// ============================================================
// GET DOCUMENT BY TRACKING ID
// ============================================================
router.get("/documents/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    let document = await SellerDocument.findOne({ trackingId });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found. Please check your link."
      });
    }
    
    res.json({
      success: true,
      document
    });
  } catch (err) {
    console.error("❌ Error fetching documents:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// CREATE DOCUMENT - WITH ADMIN NOTIFICATION
// ============================================================
router.post("/documents/create", async (req, res) => {
  try {
    const { email, company } = req.body;
    
    console.log("📄 [CREATE] Creating document for:", email);
    
    if (!email || !company) {
      return res.status(400).json({
        success: false,
        message: "Email and company are required"
      });
    }

    let existing = await SellerDocument.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Document already exists for this email",
        trackingId: existing.trackingId
      });
    }
    
    let trackingId;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      trackingId = generateTrackingId();
      const existingDoc = await SellerDocument.findOne({ trackingId });
      if (!existingDoc) isUnique = true;
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error("Failed to generate unique tracking ID");
    }
    
    const document = new SellerDocument({
      email,
      company,
      trackingId,
      status: 'draft',
      categories: [],
      category: "",
      businessName: company,
      website: "",
      brand: { description: "" },
      logo: { image: "" }
    });
    
    await document.save();
    
    console.log("✅ [CREATE] Document created with tracking ID:", trackingId);

    try {
      await sendAdminDocumentNotification(document);
      console.log(`✅ Admin notification email sent for document: ${document.trackingId}`);
    } catch (adminEmailErr) {
      console.error("❌ Admin email error:", adminEmailErr);
    }
    
    res.json({
      success: true,
      message: "Document created successfully",
      trackingId: document.trackingId,
      document
    });
  } catch (err) {
    console.error("❌ Error creating document:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ============================================================
// SAVE DOCUMENT - WITH BUSINESS NAME FIX
// ============================================================
router.post("/documents/save", async (req, res) => {
  try {
    const { trackingId, categories, category, businessName, website, ...data } = req.body;
    
    console.log("📝 [SAVE] Received data:", { 
      trackingId, 
      categories, 
      category, 
      businessName, 
      website 
    });
    
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: "Tracking ID is required"
      });
    }
    
    let document = await SellerDocument.findOne({ trackingId });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    // ✅ Save businessName
    if (businessName !== undefined && businessName !== null) {
      document.businessName = businessName.trim();
      console.log(`✅ Business name saved: "${document.businessName}"`);
    }
    
    // ✅ Save categories
    if (categories !== undefined && Array.isArray(categories)) {
      document.categories = categories;
      document.category = categories.length > 0 ? categories[0] : "";
      console.log(`✅ Categories saved: ${categories.join(', ')}`);
    }
    
    // ✅ Save website
    if (website !== undefined) {
      document.website = website;
    }
    
    // Handle logo
    if (data.logo) {
      document.logo = { ...document.logo, ...data.logo };
      if (document.logo.status === 'rejected' && data.logo.image) {
        document.logo.status = 'resubmitted';
        document.logo.resubmittedAt = new Date();
      }
    }
    
    // Handle brand
    if (data.brand) {
      document.brand = { ...document.brand, ...data.brand };
      if (document.brand.status === 'rejected' && data.brand.description) {
        document.brand.status = 'resubmitted';
        document.brand.resubmittedAt = new Date();
      }
    }
    
    const sections = ['aadhaar', 'pan', 'gst', 'bank', 'contact', 'business'];
    sections.forEach(section => {
      if (data[section]) {
        document[section] = { ...document[section], ...data[section] };
        if (document[section].status === 'rejected') {
          let hasChanges = false;
          const fields = Object.keys(data[section]);
          for (const field of fields) {
            if (data[section][field] && data[section][field] !== '') {
              hasChanges = true;
              break;
            }
          }
          if (hasChanges) {
            document[section].status = 'resubmitted';
            document[section].resubmittedAt = new Date();
          }
        }
      }
    });
    
    document.lastSaved = new Date();
    await document.save();
    
    console.log("✅ Document saved successfully");
    console.log(`📄 Document data:`, {
      id: document._id,
      businessName: document.businessName,
      categories: document.categories,
      status: document.status
    });
    
    res.json({
      success: true,
      message: "Document saved successfully",
      document
    });
  } catch (err) {
    console.error("❌ Error saving documents:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// UPLOAD FILE (WITH FULL CORS)
// ============================================================
router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    const { trackingId, field } = req.body;
    
    console.log("📤 Uploading file for tracking ID:", trackingId);
    console.log("📤 Field:", field);
    console.log("📤 File size:", req.file?.size);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }
    
    if (!trackingId || !field) {
      return res.status(400).json({
        success: false,
        message: "Tracking ID and field are required"
      });
    }
    
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    
    let document = await SellerDocument.findOne({ trackingId });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    // Update the specific field
    const fieldParts = field.split('.');
    if (fieldParts.length === 2) {
      const [section, key] = fieldParts;
      
      if (section === 'logo' && key === 'image') {
        document.logo = { ...document.logo, image: fileUrl };
        if (document.logo.status === 'rejected') {
          document.logo.status = 'resubmitted';
          document.logo.resubmittedAt = new Date();
        }
      } else if (document[section]) {
        document[section][key] = fileUrl;
        if (document[section].status === 'rejected') {
          document[section].status = 'resubmitted';
          document[section].resubmittedAt = new Date();
        }
      }
    }
    
    document.lastSaved = new Date();
    await document.save();
    
    console.log("✅ File uploaded successfully:", fileUrl);
    
    res.json({
      success: true,
      message: "File uploaded successfully",
      fileUrl: fileUrl,
      document
    });
  } catch (err) {
    console.error("❌ Error uploading file:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// SUBMIT DOCUMENTS - WITHOUT BUSINESS NAME VALIDATION
// ============================================================
router.post("/documents/submit", async (req, res) => {
  try {
    const { trackingId } = req.body;
    
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: "Tracking ID is required"
      });
    }
    
    const document = await SellerDocument.findOne({ trackingId });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // ✅ Validate categories
    if (!document.categories || document.categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one brand category.",
        field: "categories"
      });
    }

    // ✅ REMOVED: Business name validation
    // if (!document.businessName || document.businessName.trim().length < 2) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Please enter your brand/business name. It must be at least 2 characters.",
    //     field: "businessName"
    //   });
    // }

    // Validate brand description
    if (!document.brand?.description || document.brand.description.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Brand description must be at least 20 characters long.",
        field: "brandDescription"
      });
    }

    if (document.brand.description.length > 1500) {
      return res.status(400).json({
        success: false,
        message: "Brand description cannot exceed 1500 characters.",
        field: "brandDescription"
      });
    }

    const requiredFields = [
      { field: 'aadhaar.number', label: 'Aadhaar Number' },
      { field: 'aadhaar.frontImage', label: 'Aadhaar Front Image' },
      { field: 'aadhaar.backImage', label: 'Aadhaar Back Image' },
      { field: 'pan.number', label: 'PAN Number' },
      { field: 'pan.image', label: 'PAN Card Image' },
      { field: 'bank.accountHolderName', label: 'Account Holder Name' },
      { field: 'bank.accountNumber', label: 'Bank Account Number' },
      { field: 'bank.ifscCode', label: 'IFSC Code' },
      { field: 'bank.bankName', label: 'Bank Name' },
      { field: 'contact.phone', label: 'Phone Number' },
      { field: 'contact.address', label: 'Address' },
      { field: 'business.registrationType', label: 'Business Type' }
    ];
    
    const missingFields = [];
    for (const reqField of requiredFields) {
      const parts = reqField.field.split('.');
      let value = document;
      for (const part of parts) {
        value = value[part];
        if (!value) break;
      }
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(reqField.label);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please fill all required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }
    
    document.status = 'submitted';
    document.submissionDate = new Date();
    await document.save();
    
    console.log(`✅ Documents submitted for: ${document.email}`);
    
    res.json({
      success: true,
      message: "Documents submitted successfully for verification",
      document
    });
  } catch (err) {
    console.error("❌ Error submitting documents:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ============================================================
// ADMIN - REJECT SPECIFIC DOCUMENT
// ============================================================
router.patch("/admin/documents/:documentId/reject-section", async (req, res) => {
  try {
    const { documentId } = req.params;
    const { section, reason } = req.body;
    
    console.log(`📝 [REJECT] Rejecting ${section} for document: ${documentId}`);
    console.log(`📝 [REJECT] Reason: ${reason}`);
    
    if (!section || !reason) {
      return res.status(400).json({
        success: false,
        message: "Section and reason are required"
      });
    }
    
    const document = await SellerDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    const sectionFields = ['logo', 'brand', 'aadhaar', 'pan', 'gst', 'bank', 'contact', 'business'];
    if (!sectionFields.includes(section)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section"
      });
    }
    
    document[section].status = 'rejected';
    document[section].rejectionReason = reason;
    document[section].resubmittedAt = null;
    document.status = 'partially_rejected';
    
    await document.save();
    
    const sectionLabels = {
      logo: 'Company Logo',
      brand: 'Brand Description',
      aadhaar: 'Aadhaar Details',
      pan: 'PAN Details',
      gst: 'GST Details',
      bank: 'Bank Details',
      contact: 'Contact Information',
      business: 'Business Information'
    };
    
    try {
      await sendDocumentRejectionEmail(
        document.email,
        document.company || 'Seller',
        sectionLabels[section] || section,
        reason
      );
      console.log(`📧 Rejection email sent for ${section} to: ${document.email}`);
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr);
    }
    
    res.json({
      success: true,
      message: `${section} rejected successfully`,
      document
    });
  } catch (err) {
    console.error("❌ Error rejecting section:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// ADMIN - VERIFY SPECIFIC DOCUMENT (WITH MULTIPLE CATEGORIES)
// ============================================================
router.patch("/admin/documents/:documentId/verify-section", async (req, res) => {
  try {
    const { documentId } = req.params;
    const { section } = req.body;
    
    console.log(`📝 [VERIFY] Verifying ${section} for document: ${documentId}`);
    
    if (!section) {
      return res.status(400).json({
        success: false,
        message: "Section is required"
      });
    }
    
    const document = await SellerDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    const sectionFields = ['logo', 'brand', 'aadhaar', 'pan', 'gst', 'bank', 'contact', 'business'];
    if (!sectionFields.includes(section)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section"
      });
    }
    
    document[section].status = 'verified';
    document[section].rejectionReason = "";
    document[section].resubmittedAt = null;
    
    let allVerified = true;
    const requiredSections = ['brand', 'aadhaar', 'pan', 'bank', 'contact', 'business'];
    for (const sec of requiredSections) {
      if (document[sec].status !== 'verified') {
        allVerified = false;
        break;
      }
    }
    
    if (allVerified) {
      document.status = 'verified';
      document.verificationDate = new Date();
      
      // ✅ Get categories from document
      const categories = document.categories || [];
      const primaryCategory = categories.length > 0 ? categories[0] : '';
      
      console.log(`✅ Categories for ${document.email}:`, categories);
      
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      
      const tempPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // ✅ Create or update Vendor with multiple categories
      let vendor = await Vendor.findOne({ email: document.email });
      
      if (!vendor) {
        vendor = new Vendor({
          name: document.businessName || document.company || document.email.split('@')[0],
          email: document.email,
          password: hashedPassword,
          role: 'vendor',
          company: document.businessName || document.company || 'N/A',
          categories: categories, // ✅ Save all categories
          category: primaryCategory, // ✅ Save primary category
          plan: 'founding',
          status: 'active',
          planUpdatedAt: new Date(),
          totalOrders: 0,
          commissionRate: 0,
          statusHistory: [{
            status: 'active',
            previousStatus: null,
            changedBy: 'System',
            changedByName: 'Admin',
            reason: 'Vendor created from document verification',
            timestamp: new Date()
          }]
        });
        await vendor.save();
        console.log(`✅ New vendor created: ${document.email} with categories: ${categories.join(', ')}`);
      } else {
        vendor.categories = categories;
        vendor.category = primaryCategory;
        vendor.company = document.businessName || document.company || vendor.company;
        vendor.name = document.businessName || document.company || vendor.name;
        vendor.password = hashedPassword;
        vendor.status = 'active';
        vendor.plan = 'founding';
        vendor.commissionRate = 0;
        vendor.planUpdatedAt = new Date();
        
        if (!vendor.statusHistory) {
          vendor.statusHistory = [];
        }
        vendor.statusHistory.push({
          status: 'active',
          previousStatus: vendor.status,
          changedBy: 'System',
          changedByName: 'Admin',
          reason: 'Account activated from document verification',
          timestamp: new Date()
        });
        await vendor.save();
        console.log(`✅ Existing vendor updated: ${document.email} with categories: ${categories.join(', ')}`);
      }
      
      // ✅ Update or create Company with multiple categories
      let company = await Company.findOne({ name: document.businessName || document.company });
      if (company) {
        company.categories = categories;
        company.category = primaryCategory;
        company.description = document.brand?.description || company.description;
        await company.save();
        console.log(`✅ Company updated: ${company.name} with categories: ${categories.join(', ')}`);
      } else {
        company = new Company({
          name: document.businessName || document.company,
          description: document.brand?.description || `${document.businessName} - Premium brand on Native91`,
          categories: categories,
          category: primaryCategory,
          status: 'Active',
        });
        await company.save();
        console.log(`✅ New company created: ${company.name} with categories: ${categories.join(', ')}`);
      }
      
      document.vendorId = vendor._id;
      document.credentialsSent = true;
      document.credentialsSentAt = new Date();
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${frontendUrl}/login`;
      
      try {
        await sendVendorCreationEmail(
          document.email,
          document.businessName || document.company || "Vendor",
          document.businessName || document.company || "N/A",
          tempPassword,
          vendor.plan || 'founding',
          vendor.commissionRate || 0,
          loginUrl,
          "Admin"
        );
        console.log(`✅ Credentials email sent to: ${document.email}`);
      } catch (emailErr) {
        console.error("❌ Credentials email error:", emailErr);
      }
    } else {
      let hasRejected = false;
      for (const sec of requiredSections) {
        if (document[sec].status === 'rejected') {
          hasRejected = true;
          break;
        }
      }
      document.status = hasRejected ? 'partially_rejected' : 'pending_review';
    }
    
    await document.save();
    
    res.json({
      success: true,
      message: `${section} verified successfully`,
      document,
      allVerified: allVerified
    });
  } catch (err) {
    console.error("❌ Error verifying section:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// ADMIN - GET DOCUMENT WITH SECTION STATUS
// ============================================================
router.get("/admin/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await SellerDocument.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    const sections = ['logo', 'brand', 'aadhaar', 'pan', 'gst', 'bank', 'contact', 'business'];
    const sectionStatus = {};
    sections.forEach(section => {
      sectionStatus[section] = {
        status: document[section]?.status || 'pending',
        rejectionReason: document[section]?.rejectionReason || '',
        resubmittedAt: document[section]?.resubmittedAt || null
      };
    });
    
    res.json({
      success: true,
      document,
      sectionStatus
    });
  } catch (err) {
    console.error("❌ Error fetching document:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// ADMIN - GET ALL DOCUMENTS
// ============================================================
router.get("/admin/documents", async (req, res) => {
  try {
    const { status, email, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (email) filter.email = { $regex: email, $options: 'i' };
    
    const skip = (page - 1) * limit;
    
    const documents = await SellerDocument.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await SellerDocument.countDocuments(filter);
    
    res.json({
      success: true,
      documents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("❌ Error fetching admin documents:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// ADMIN - GET STATS
// ============================================================
router.get("/admin/documents/stats", async (req, res) => {
  try {
    const stats = await SellerDocument.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = await SellerDocument.countDocuments();
    
    const result = {
      total,
      draft: 0,
      submitted: 0,
      pending_review: 0,
      partially_rejected: 0,
      verified: 0,
      rejected: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
    });
    
    res.json({
      success: true,
      stats: result
    });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// OTHER ROUTES
// ============================================================
router.get("/documents/email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const document = await SellerDocument.findOne({ email });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found for this email"
      });
    }
    res.json({ success: true, document });
  } catch (err) {
    console.error("❌ Error fetching documents:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// SEND DOCUMENT LINK EMAIL
// ============================================================
router.post("/documents/send-link", async (req, res) => {
  try {
    const { email, trackingId, company } = req.body;
    
    console.log("📧 Sending document link to:", email);
    console.log("📦 Tracking ID:", trackingId);

    if (!email || !trackingId) {
      return res.status(400).json({
        success: false,
        message: "Email and tracking ID are required"
      });
    }

    const document = await SellerDocument.findOne({ trackingId });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found for this tracking ID"
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const link = `${frontendUrl}/document-upload/${trackingId}`;

    let emailResult;
    try {
      emailResult = await sendDocumentLinkEmail(
        email, 
        trackingId, 
        company || document.company || "Seller"
      );
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr.message);
      emailResult = { success: false, error: emailErr.message, link: link };
    }

    res.json({
      success: true,
      message: emailResult.success 
        ? "Document link sent successfully to your email" 
        : "Document link generated. Please copy the link manually.",
      link: link,
      trackingId: trackingId,
      emailSent: emailResult.success || false,
      emailError: emailResult.error || null,
      mock: emailResult.mock || false
    });
  } catch (err) {
    console.error("❌ Error sending document link:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
});

// ============================================================
// SEND APPROVAL EMAIL
// ============================================================
router.post("/send-approval-email", async (req, res) => {
  try {
    const { email, name, company, vendorId, trackingId } = req.body;
    
    console.log("📧 [send-approval-email] Received request:", { email, name, company, trackingId });
    
    if (!email || !name || !company) {
      return res.status(400).json({
        success: false,
        message: "Email, name, and company are required"
      });
    }

    let finalTrackingId = trackingId;
    
    if (!finalTrackingId) {
      const existingDoc = await SellerDocument.findOne({ email });
      if (existingDoc) {
        finalTrackingId = existingDoc.trackingId;
      } else {
        let newTrackingId;
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          newTrackingId = generateTrackingId();
          const existingDoc = await SellerDocument.findOne({ trackingId: newTrackingId });
          if (!existingDoc) isUnique = true;
          attempts++;
        }
        
        if (!isUnique) {
          throw new Error("Failed to generate unique tracking ID");
        }
        
        const newDoc = new SellerDocument({
          email,
          company,
          trackingId: newTrackingId,
          status: 'draft',
          categories: [],
          category: "",
          businessName: company,
          website: "",
          brand: { description: "" },
          logo: { image: "" }
        });
        await newDoc.save();
        finalTrackingId = newTrackingId;
      }
    }

    const result = await sendApprovalEmail(email, name, company, vendorId, finalTrackingId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Approval email sent to ${email}`,
        link: result.link,
        trackingId: finalTrackingId
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to send approval email"
      });
    }
  } catch (err) {
    console.error("❌ [send-approval-email] Error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
});

// ============================================================
// SEND REJECTION EMAIL
// ============================================================
router.post("/send-rejection-email", async (req, res) => {
  try {
    const { email, name, company, reason } = req.body;
    
    console.log("📧 Sending rejection email to:", email);
    
    if (!email || !name || !company || !reason) {
      return res.status(400).json({
        success: false,
        message: "Email, name, company, and reason are required"
      });
    }

    const result = await sendRejectionEmail(email, name, company, reason);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Rejection email sent to ${email}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to send rejection email"
      });
    }
  } catch (err) {
    console.error("❌ Send rejection email error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;