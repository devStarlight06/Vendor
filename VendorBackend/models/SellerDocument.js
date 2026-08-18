// models/SellerDocument.js
const mongoose = require("mongoose");

const sellerDocumentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      index: true,
      unique: true,
    },

    company: {
      type: String,
    },

    trackingId: {
      type: String,
      unique: true,
      index: true,
    },

    // Brand Information
    logo: {
      image: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    brand: {
      description: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    aadhaar: {
      number: {
        type: String,
        default: "",
      },
      frontImage: {
        type: String,
        default: "",
      },
      backImage: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    pan: {
      number: {
        type: String,
        default: "",
      },
      image: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    gst: {
      number: {
        type: String,
        default: "",
      },
      certificate: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    bank: {
      accountHolderName: {
        type: String,
        default: "",
      },
      accountNumber: {
        type: String,
        default: "",
      },
      confirmAccountNumber: {
        type: String,
        default: "",
      },
      ifscCode: {
        type: String,
        default: "",
      },
      bankName: {
        type: String,
        default: "",
      },
      branchName: {
        type: String,
        default: "",
      },
      upiId: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    contact: {
      phone: {
        type: String,
        default: "",
      },
      alternatePhone: {
        type: String,
        default: "",
      },
      address: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      pincode: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "India",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    business: {
      registrationType: {
        type: String,
        enum: [
          "sole_proprietorship",
          "partnership",
          "llp",
          "private_limited",
          "public_limited",
          "other",
          "",
        ],
        default: "",
      },
      registrationNumber: {
        type: String,
        default: "",
      },
      certificate: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected", "resubmitted"],
        default: "pending",
      },
      rejectionReason: {
        type: String,
        default: "",
      },
      resubmittedAt: {
        type: Date,
      },
    },

    // Overall document status
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "pending_review",
        "partially_rejected",
        "verified",
        "rejected",
      ],
      default: "draft",
    },

    submissionDate: {
      type: Date,
    },

    verificationDate: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    lastSaved: {
      type: Date,
      default: Date.now,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    credentialsSent: {
      type: Boolean,
      default: false,
    },

    credentialsSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

sellerDocumentSchema.index({
  email: 1,
  trackingId: 1,
});

module.exports = mongoose.model("SellerDocument", sellerDocumentSchema);
