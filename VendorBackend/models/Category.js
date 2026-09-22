// models/Category.js
const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, { _id: true });

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  // ✅ SUB-CATEGORIES (Object array with name + status)
  subcategories: {
    type: [subCategorySchema],
    default: []
  }
}, {
  timestamps: true
});

// ✅ Pre-save: Clean subcategories (remove JSON strings, duplicates)
categorySchema.pre("save", function () {
  const doc = this;
  if (!Array.isArray(doc.subcategories)) {
    doc.subcategories = [];
    return;
  }

  const cleaned = [];
  const seen = new Set();

  doc.subcategories.forEach((sub) => {
    if (!sub) return;

    let name = "";
    let status = "active";

    // Object with name
    if (typeof sub === "object" && sub !== null) {
      name = sub.name || "";
      status = sub.status || "active";
    }
    // String — may contain JSON
    else if (typeof sub === "string") {
      let s = sub.trim();
      if (!s) return;

      // Parse JSON strings
      if (s.startsWith("[") || s.startsWith('"')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              const pName = String(p).replace(/^[\[\]\\"]+|[\[\]\\"]+$/g, "").trim();
              if (pName && !seen.has(pName.toLowerCase())) {
                seen.add(pName.toLowerCase());
                cleaned.push({ name: pName, status: "active" });
              }
            });
            return;
          } else if (typeof parsed === "string") {
            s = parsed.trim();
          }
        } catch {}
      }

      // Clean brackets, quotes, backslashes
      name = s
        .replace(/^[\[\]\\"]+/, "")
        .replace(/[\[\]\\"]+$/, "")
        .trim();
    }

    // Skip empty or duplicates
    if (!name || name.length > 100) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    cleaned.push({
      name,
      status: status === "inactive" ? "inactive" : "active"
    });
  });

  doc.subcategories = cleaned;
});

module.exports = mongoose.model("Category", categorySchema);