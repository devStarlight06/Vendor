// sellerDocument.routes.js - COMPLETE FIXED VERSION (NO EMAILS FROM BACKEND)
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const SellerDocument = require("../models/SellerDocument");
const Vendor = require("../models/Vendor");

// ✅ IMPORT EMAIL FUNCTIONS (only for rejection emails)
const { 
  sendDocumentLinkEmail,
  sendApprovalEmail,
  sendRejectionEmail
} = require("../middleware/emailService");

const generateTrackingId = () => {
  return 'DOC-' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

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
    fileSize: 10 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024
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
// GET DOCUMENT BY EMAIL
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
// CREATE DOCUMENT
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
      status: 'draft'
    });
    
    await document.save();
    
    console.log("✅ [CREATE] Document created with tracking ID:", trackingId);
    
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
// SAVE DOCUMENT
// ============================================================
router.post("/documents/save", async (req, res) => {
  try {
    const { trackingId, ...data } = req.body;
    
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: "Tracking ID is required"
      });
    }
    
    console.log("Saving document for tracking ID:", trackingId);
    
    let document = await SellerDocument.findOne({ trackingId });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    // Update fields based on data received
    if (data.aadhaar) {
      document.aadhaar = { ...document.aadhaar, ...data.aadhaar };
    }
    if (data.pan) {
      document.pan = { ...document.pan, ...data.pan };
    }
    if (data.gst) {
      document.gst = { ...document.gst, ...data.gst };
    }
    if (data.bank) {
      document.bank = { ...document.bank, ...data.bank };
    }
    if (data.contact) {
      document.contact = { ...document.contact, ...data.contact };
    }
    if (data.business) {
      document.business = { ...document.business, ...data.business };
    }
    if (data.status) {
      document.status = data.status;
    }
    
    document.lastSaved = new Date();
    await document.save();
    
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
// UPLOAD FILE
// ============================================================
router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    const { trackingId, field } = req.body;
    
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
      if (document[section]) {
        document[section][key] = fileUrl;
      }
    }
    
    document.lastSaved = new Date();
    await document.save();
    
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
// SUBMIT DOCUMENTS
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

    const requiredFields = [
      { field: 'aadhaar.number', label: 'Aadhaar Number' },
      { field: 'pan.number', label: 'PAN Number' },
      { field: 'bank.accountNumber', label: 'Bank Account Number' },
      { field: 'bank.ifscCode', label: 'IFSC Code' },
      { field: 'contact.phone', label: 'Phone Number' }
    ];
    
    const missingFields = [];
    for (const reqField of requiredFields) {
      const parts = reqField.field.split('.');
      let value = document;
      for (const part of parts) {
        value = value[part];
        if (!value) break;
      }
      if (!value) {
        missingFields.push(reqField.label);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
        missingFields
      });
    }
    
    document.status = 'submitted';
    document.submissionDate = new Date();
    await document.save();
    
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
// ADMIN - GET SINGLE DOCUMENT
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
    
    res.json({
      success: true,
      document
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
// ADMIN - APPROVE APPLICATION (NO EMAIL - Frontend handles it)
// ============================================================
router.post("/sellers/applications/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    console.log(`📝 [APPROVE] Approving application: ${id}`);
    
    // Find the application
    const Application = require("../models/Application");
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }
    
    console.log(`📝 [APPROVE] Application: ${application.businessName}, Email: ${application.email}`);
    
    // Update status
    application.status = 'approved';
    application.adminNotes = notes || '';
    application.verifiedAt = new Date();
    await application.save();
    
    console.log(`✅ [APPROVE] Application status updated to approved`);
    
    // Get or create document tracking ID
    let docTrackingId = application.documentTrackingId;
    
    if (!docTrackingId) {
      const existingDoc = await SellerDocument.findOne({ 
        email: application.email 
      });
      
      if (existingDoc) {
        docTrackingId = existingDoc.trackingId;
        console.log(`📄 [APPROVE] Found existing document: ${docTrackingId}`);
      } else {
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
        
        const newDoc = new SellerDocument({
          email: application.email,
          company: application.businessName,
          trackingId: trackingId,
          status: 'draft'
        });
        await newDoc.save();
        docTrackingId = trackingId;
        console.log(`📄 [APPROVE] Created new document: ${docTrackingId}`);
      }
    }
    
    // Save tracking ID on application
    application.documentTrackingId = docTrackingId;
    await application.save();
    
    // ========================================================
    // ⚠️ IMPORTANT: NO EMAIL SENT HERE!
    // The frontend will handle sending the approval email
    // via /send-approval-email endpoint
    // ========================================================
    
    console.log(`✅ [APPROVE] Application approved successfully`);
    console.log(`📄 [APPROVE] Document Tracking ID: ${docTrackingId}`);
    console.log(`📧 [APPROVE] NO EMAIL SENT - Frontend will handle it`);
    
    return res.json({
      success: true,
      message: `Application approved successfully`,
      application,
      trackingId: docTrackingId,
      vendorId: null // No vendor created here
    });
    
  } catch (err) {
    console.error(`❌ [APPROVE] Error:`, err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// ADMIN - VERIFY DOCUMENT (NO EMAIL - Only verification)
// ============================================================
router.patch("/admin/documents/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'verified' or 'rejected'"
      });
    }
    
    const document = await SellerDocument.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    document.status = status;
    document.verificationDate = new Date();
    
    // =================== REJECTED ===================
    if (status === 'rejected') {
      document.rejectionReason = rejectionReason;
      await document.save();
      
      // Send rejection email (this is fine - rejection only)
      try {
        await sendRejectionEmail(
          document.email,
          document.company || "Seller",
          document.company,
          rejectionReason || "No reason provided"
        );
        console.log(`📧 Rejection email sent to: ${document.email}`);
      } catch (emailErr) {
        console.error("❌ Rejection email error:", emailErr);
      }
      
      return res.json({
        success: true,
        message: `✅ Documents rejected. Email sent to ${document.email}`,
        document
      });
    }
    
    // =================== VERIFIED ===================
    if (status === 'verified') {
      console.log(`✅ Documents verified for: ${document.email}`);
      
      // Save verification status
      document.verificationDate = new Date();
      document.credentialsSent = false;
      document.credentialsSentAt = null;
      await document.save();
      
      console.log(`✅ [VERIFY] Verification saved successfully`);
      console.log(`📧 [VERIFY] NO approval email sent during verification`);
      
      // ========================================================
      // ⚠️ IMPORTANT: NO APPROVAL EMAIL SENT HERE!
      // The approval email should only be sent once during approval
      // ========================================================
      
      return res.json({
        success: true,
        message: `✅ Documents verified successfully`,
        document
      });
    }
    
  } catch (err) {
    console.error("❌ Error verifying documents:", err);
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

    // Check if document exists
    const document = await SellerDocument.findOne({ trackingId });
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found for this tracking ID"
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const link = `${frontendUrl}/document-upload/${trackingId}`;

    // Try to send email, but always return the link
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

    // Always return success with the link
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
// SEND APPROVAL EMAIL (Manual - NO PASSWORD)
// ============================================================
router.post("/send-approval-email", async (req, res) => {
  try {
    const { email, name, company, vendorId, trackingId } = req.body;
    
    console.log("📧 [send-approval-email] Received request:");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Company: ${company}`);
    console.log(`   Tracking ID: ${trackingId}`);
    
    if (!email || !name || !company) {
      return res.status(400).json({
        success: false,
        message: "Email, name, and company are required"
      });
    }

    // If no tracking ID, try to find or create one
    let finalTrackingId = trackingId;
    
    if (!finalTrackingId) {
      console.log("⚠️ [send-approval-email] No tracking ID provided, trying to find/create one...");
      
      const existingDoc = await SellerDocument.findOne({ email });
      if (existingDoc) {
        finalTrackingId = existingDoc.trackingId;
        console.log("📄 [send-approval-email] Found existing document:", finalTrackingId);
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
          status: 'draft'
        });
        await newDoc.save();
        finalTrackingId = newTrackingId;
        console.log("📄 [send-approval-email] Created new document:", finalTrackingId);
      }
    }

    const result = await sendApprovalEmail(email, name, company, vendorId, finalTrackingId);
    
    console.log("📧 [send-approval-email] Result:", result);
    
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
    console.log("📝 Reason:", reason);
    
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

// ============================================================
// CHECK DOCUMENT STATUS WITH VENDOR INFO
// ============================================================
router.get("/documents/status/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const document = await SellerDocument.findOne({ trackingId });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    let vendorInfo = null;
    if (document.status === 'verified' && document.vendorId) {
      const vendor = await Vendor.findById(document.vendorId).select('-password');
      if (vendor) {
        vendorInfo = {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          company: vendor.company,
          plan: vendor.plan,
          status: vendor.status,
          createdAt: vendor.createdAt
        };
      }
    }
    
    res.json({
      success: true,
      document: {
        trackingId: document.trackingId,
        email: document.email,
        company: document.company,
        status: document.status,
        submissionDate: document.submissionDate,
        verificationDate: document.verificationDate,
        rejectionReason: document.rejectionReason,
        credentialsSent: document.credentialsSent || false,
        credentialsSentAt: document.credentialsSentAt || null
      },
      vendor: vendorInfo
    });
  } catch (err) {
    console.error("❌ Error checking document status:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;