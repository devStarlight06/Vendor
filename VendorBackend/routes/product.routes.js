// routes/product.routes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const Category = require("../models/Category");
const auth = require("../middleware/auth");

const {
  getEffectiveCommissionRate,
  getVendorPlanDetails,
  isCurrentMonthFree,
  getFreeMonthDescription,
  PLAN_DETAILS
} = require("../middleware/commissionUtils");

// ============================================================
// MULTER SETUP
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg/;
  const isImage = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
    allowedImageTypes.test(file.mimetype);
  const allowedExcelTypes = /xlsx|xls/;
  const isExcel = allowedExcelTypes.test(path.extname(file.originalname).toLowerCase()) ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel';
  const isCSV = file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv';
  if (isImage || isExcel || isCSV) return cb(null, true);
  cb(new Error("Only image files, Excel files, or CSV files are allowed!"));
};

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only image files are allowed!"));
  },
});

const bulkUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// ============================================================
// HELPERS
// ============================================================
const getRowValue = (row, columnNames) => {
  for (const col of columnNames) {
    for (const key of Object.keys(row)) {
      const normalizedKey = key.replace(/\*/g, '').trim().toLowerCase();
      const normalizedCol = col.toLowerCase();
      if (normalizedKey === normalizedCol) return row[key];
    }
  }
  return undefined;
};

const sortByOriginalName = (files) => {
  return (files || [])
    .sort((a, b) => a.originalname.localeCompare(b.originalname))
    .map(f => `/uploads/${f.filename}`);
};

// ✅ STRONG cleanSubcategoryString
const cleanSubcategoryString = (s) => {
  if (!s) return "";
  if (typeof s !== "string") s = String(s);

  let cleaned = s.trim();
  if (!cleaned) return "";

  let iter = 0;
  while ((cleaned.startsWith("[") || cleaned.startsWith('"')) && iter < 5) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) cleaned = String(parsed[0] || "").trim();
      else if (typeof parsed === "string") cleaned = parsed.trim();
      else break;
    } catch { break; }
    iter++;
  }

  let prev = null;
  let stripIter = 0;
  while (cleaned !== prev && stripIter < 15) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/^[\s\[\]"'\\\/]+/, "")
      .replace(/[\s\[\]"'\\\/]+$/, "")
      .trim();
    stripIter++;
  }

  cleaned = cleaned.replace(/\\+/g, "").trim();
  cleaned = cleaned
    .replace(/^[\[\]"']+/, "")
    .replace(/[\[\]"']+$/, "")
    .trim();

  if (cleaned.includes(",") && !cleaned.includes(" & ")) {
    const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) cleaned = parts[0];
  }

  if (cleaned.length === 0 || cleaned.length > 100) return "";
  if (/^[\\\/\[\]"'\s]+$/.test(cleaned)) return "";

  return cleaned;
};

const parseSubcategories = (rawSubs) => {
  if (!rawSubs) return [];

  let subs = [];

  if (typeof rawSubs === "string") {
    try {
      const parsed = JSON.parse(rawSubs);
      if (Array.isArray(parsed)) subs = parsed;
      else subs = [rawSubs];
    } catch {
      subs = rawSubs.split(",").map(s => s.trim()).filter(Boolean);
    }
  } else if (Array.isArray(rawSubs)) {
    subs = rawSubs;
  } else {
    subs = [rawSubs];
  }

  const cleaned = [];
  const seen = new Set();
  subs.forEach(s => {
    const val = cleanSubcategoryString(s);
    if (!val) return;
    const key = val.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(val);
  });

  return cleaned;
};

// 🆕 Parse categories + categorySubcategoryMap from body (used in POST + PUT)
const parseMultiCategoryData = (body) => {
  // Handle both flat keys and nested object (multer vs body-parser)
  const getRaw = (flatKey, nestedKey) => {
    if (body[flatKey] !== undefined) return body[flatKey];
    if (body[nestedKey] !== undefined) return body[nestedKey];
    return undefined;
  };

  let categories = [];
  const rawCats = getRaw('categories', 'categories');
  if (rawCats !== undefined) {
    if (Array.isArray(rawCats)) {
      categories = rawCats;
    } else {
      try {
        const parsed = JSON.parse(rawCats);
        if (Array.isArray(parsed)) categories = parsed;
      } catch { categories = []; }
    }
  }

  let categorySubcategoryMap = {};
  const rawMap = getRaw('categorySubcategoryMap', 'categorySubcategoryMap');
  if (rawMap !== undefined) {
    if (typeof rawMap === 'object' && !Array.isArray(rawMap)) {
      categorySubcategoryMap = rawMap;
    } else {
      try {
        const parsed = JSON.parse(rawMap);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          categorySubcategoryMap = parsed;
        }
      } catch { categorySubcategoryMap = {}; }
    }
  }

  // Clean each entry
  const cleanedMap = {};
  Object.keys(categorySubcategoryMap).forEach(catKey => {
    const arr = categorySubcategoryMap[catKey];
    if (Array.isArray(arr)) {
      const cleanedArr = [];
      const seen = new Set();
      arr.forEach(s => {
        const val = cleanSubcategoryString(s);
        if (!val) return;
        const key = val.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        cleanedArr.push(val);
      });
      cleanedMap[catKey] = cleanedArr;
    } else {
      cleanedMap[catKey] = [];
    }
  });

  return { categories, categorySubcategoryMap: cleanedMap };
};

const getUniqueSubCategories = async (filter) => {
  const single = await Product.distinct("subcategory", filter);
  const multiple = await Product.distinct("subcategories", filter);
  const flatMultiple = multiple.flat().filter(Boolean);
  const fromProducts = [...single, ...flatMultiple];

  let fromAdmin = [];
  if (filter.category) {
    try {
      const adminCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${filter.category}$`, "i") },
        status: "active"
      }).select("subcategories");
      if (adminCategory && Array.isArray(adminCategory.subcategories)) {
        fromAdmin = adminCategory.subcategories
          .filter(sc => !sc.status || sc.status === "active")
          .map(sc => sc.name)
          .filter(Boolean);
      }
    } catch (err) {
      console.error("Error fetching admin subcategories:", err);
    }
  }

  const merged = [...fromProducts, ...fromAdmin];

  const cleaned = [];
  const seen = new Set();
  merged.forEach(s => {
    const val = cleanSubcategoryString(s);
    if (!val) return;
    const key = val.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(val);
  });

  return cleaned;
};

// 🆕 Parse variants — pointer approach
const parseVariants = (rawVariants, variantImagePaths) => {
  let variants = [];
  try {
    if (rawVariants) {
      variants = typeof rawVariants === "string" ? JSON.parse(rawVariants) : rawVariants;
    }
  } catch (e) {
    console.error("Error parsing variants:", e);
    variants = [];
  }

  let imagePtr = 0;

  return variants.map(v => {
    let imagePath = v.image || "";
    if (v.hasNewImage && variantImagePaths[imagePtr]) {
      imagePath = variantImagePaths[imagePtr];
      imagePtr++;
    }
    return {
      _id: v._id,
      color: v.color || "",
      size: v.size || "",
      image: imagePath,
      stock: parseInt(v.stock) || 0,
      isAvailable: v.isAvailable !== false,
      price: parseFloat(v.price) || 0
    };
  });
};


const parseCustomField = (body) => {
  // 1) flat keys (multer) → "customField[enabled]"
  let rawEnabled = body['customField[enabled]'];
  let rawLabel   = body['customField[label]'];

  // 2) nested object (body-parser) → body.customField.enabled
  if (rawEnabled === undefined && body.customField) {
    rawEnabled = body.customField.enabled;
  }
  if (rawLabel === undefined && body.customField) {
    rawLabel = body.customField.label;
  }

  // 3) JSON string fallback
  if (rawEnabled === undefined && body.customField && typeof body.customField === 'string') {
    try {
      const parsed = JSON.parse(body.customField);
      rawEnabled = parsed.enabled;
      rawLabel   = parsed.label;
    } catch (e) { /* ignore */ }
  }

  const enabled =
    rawEnabled === 'true' || rawEnabled === true ||
    rawEnabled === 'on'   || rawEnabled === 1 || rawEnabled === '1' ||
    rawEnabled === 'yes'  || rawEnabled === 'YES';

  const label = (rawLabel || "").toString().trim();

  console.log("🔧 parseCustomField:", {
    rawEnabled,
    rawLabel,
    enabled,
    label,
    bodyKeysWithCustom: Object.keys(body || {}).filter(k =>
      k.toLowerCase().includes('custom')
    ),
  });

  return {
    enabled: enabled,
    label: enabled ? label : ""     // label only kept if enabled
  };
};

// ============================================================
// GET VENDOR PLAN
// ============================================================
router.get("/my-plan", auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    const planDetails = getVendorPlanDetails(vendor);
    res.json({
      success: true,
      vendor: {
        id: vendor._id, name: vendor.name, company: vendor.company,
        plan: vendor.plan, status: vendor.status,
        planDetails, effectiveCommission: planDetails.effectiveCommission,
        isFreeMonth: isCurrentMonthFree(),
        freeMonthDescription: getFreeMonthDescription()
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET MY PRODUCTS
// ============================================================
router.get("/my-products", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.company) return res.status(400).json({ message: "User company not found" });
    const products = await Product.find({ company: req.user.company });
    const vendor = await Vendor.findById(req.user.id);
    const effectiveCommission = getEffectiveCommissionRate(vendor);
    res.json({
      products, commissionRate: effectiveCommission,
      plan: vendor.plan || 'STARTER',
      isFreeMonth: isCurrentMonthFree(),
      freeMonthDescription: getFreeMonthDescription()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET SHIPPING OPTIONS
// ============================================================
router.get("/shipping-options", auth, async (req, res) => {
  try {
    const shippingOptions = [
      { value: '1-2 days', label: '1-2 days' },
      { value: '2-3 days', label: '2-3 days' },
      { value: '3-4 days', label: '3-4 days' },
      { value: '3-5 days', label: '3-5 days' },
      { value: '5-7 days', label: '5-7 days' },
      { value: '7-10 days', label: '7-10 days' },
      { value: '10-15 days', label: '10-15 days' },
      { value: '15-30 days', label: '15-30 days' },
      { value: 'Custom', label: 'Custom (specify custom shipping time)' }
    ];
    res.json({ success: true, shippingOptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// GET SUB-CATEGORIES
// ============================================================
router.get("/categories/:category/subcategories", auth, async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    if (!req.user || !req.user.company) return res.status(400).json({ success: false, message: "User company not found" });
    const subCategories = await getUniqueSubCategories({ category, company: req.user.company });
    res.json({ success: true, category, subCategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/sub-categories/:category", auth, async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const subCategories = await getUniqueSubCategories({ category, company: req.user.company });
    res.json({ success: true, category, subCategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/all-sub-categories", auth, async (req, res) => {
  try {
    const subCategories = await getUniqueSubCategories({ company: req.user.company });
    res.json({ success: true, subCategories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/categories-with-sub", auth, async (req, res) => {
  try {
    const categories = await Product.distinct("category", { company: req.user.company });
    const data = await Promise.all(
      categories.map(async (category) => ({
        category,
        subCategories: await getUniqueSubCategories({ category, company: req.user.company })
      }))
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 🆕 ADD PRODUCT — PERSISTS categories + categorySubcategoryMap + customField
// ============================================================
router.post("/", auth, imageUpload.fields([
  { name: "images", maxCount: 10 },
  { name: "variantImages", maxCount: 50 }
]), async (req, res) => {
  try {
    const mainImages = sortByOriginalName(req.files?.images);
    const variantImagePaths = (req.files?.variantImages || []).map(f => `/uploads/${f.filename}`);

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const effectiveCommission = getEffectiveCommissionRate(vendor);
    const isFree = isCurrentMonthFree();

    const dimensions = {
      length: parseFloat(req.body['dimensions[length]']) || 0,
      width: parseFloat(req.body['dimensions[width]']) || 0,
      height: parseFloat(req.body['dimensions[height]']) || 0,
      unit: req.body['dimensions[unit]'] || 'cm'
    };

    const shippingTime = req.body.shippingTime || '3-5 days';
    const customShippingTime = req.body.customShippingTime || '';
    const shippingCharge = parseFloat(req.body.shippingCharge) || 0;
    const isFreeShipping = req.body.isFreeShipping === 'true' || req.body.isFreeShipping === true;
    const minDays = parseInt(req.body['estimatedDeliveryDays[min]']) || 3;
    const maxDays = parseInt(req.body['estimatedDeliveryDays[max]']) || 5;

    const ingredients = req.body.ingredients || "";
    const ingredientsList = req.body.ingredientsList ?
      (Array.isArray(req.body.ingredientsList) ? req.body.ingredientsList : req.body.ingredientsList.split(',').map(i => i.trim())) : [];

    const nutritionalInfo = {
      servingSize: req.body['nutritionalInfo[servingSize]'] || "",
      calories: parseFloat(req.body['nutritionalInfo[calories]']) || 0,
      protein: parseFloat(req.body['nutritionalInfo[protein]']) || 0,
      carbohydrates: parseFloat(req.body['nutritionalInfo[carbohydrates]']) || 0,
      fat: parseFloat(req.body['nutritionalInfo[fat]']) || 0,
      sugar: parseFloat(req.body['nutritionalInfo[sugar]']) || 0,
      fiber: parseFloat(req.body['nutritionalInfo[fiber]']) || 0,
      sodium: parseFloat(req.body['nutritionalInfo[sodium]']) || 0
    };

    const allergens = req.body.allergens ?
      (Array.isArray(req.body.allergens) ? req.body.allergens : req.body.allergens.split(',').map(a => a.trim())) : [];

    const dietaryInfo = {
      isVegetarian: req.body['dietaryInfo[isVegetarian]'] === 'true' || req.body['dietaryInfo[isVegetarian]'] === true,
      isVegan: req.body['dietaryInfo[isVegan]'] === 'true' || req.body['dietaryInfo[isVegan]'] === true,
      isGlutenFree: req.body['dietaryInfo[isGlutenFree]'] === 'true' || req.body['dietaryInfo[isGlutenFree]'] === true,
      isDairyFree: req.body['dietaryInfo[isDairyFree]'] === 'true' || req.body['dietaryInfo[isDairyFree]'] === true,
      isNutFree: req.body['dietaryInfo[isNutFree]'] === 'true' || req.body['dietaryInfo[isNutFree]'] === true,
      isOrganic: req.body['dietaryInfo[isOrganic]'] === 'true' || req.body['dietaryInfo[isOrganic]'] === true
    };

    const customField = parseCustomField(req.body);

    const { categories, categorySubcategoryMap } = parseMultiCategoryData(req.body);

    let subcategories = parseSubcategories(
      req.body.subcategories || req.body.subCategories || req.body.subcategory
    );

    if (Object.keys(categorySubcategoryMap).length > 0) {
      const fromMap = [];
      Object.values(categorySubcategoryMap).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(s => {
            const val = cleanSubcategoryString(s);
            if (val && !fromMap.includes(val)) fromMap.push(val);
          });
        }
      });
      if (fromMap.length > 0) subcategories = fromMap;
    }

    const subcategory = subcategories[0] || "";

    const variants = parseVariants(req.body.variants, variantImagePaths);

    const product = new Product({
      name: req.body.name,
      description: req.body.description || "",
      price: req.body.price,
      category: req.body.category,
      categories,
      categorySubcategoryMap,
      subcategory,
      subcategories,
      image: mainImages,
      variants,
      company: vendor.company,
      vendorId: req.user.id,
      commission_rate: effectiveCommission,
      stock: parseInt(req.body.stock) || 0,
      isActive: true,
      size: req.body.size || "",
      weight: parseFloat(req.body.weight) || 0,
      weightUnit: req.body.weightUnit || "",
      sku: req.body.sku || "",
      variant: req.body.variant || "",
      dimensions,
      shippingTime,
      customShippingTime,
      estimatedDeliveryDays: { min: minDays, max: maxDays },
      shippingCharge,
      isFreeShipping,
      ingredients,
      ingredientsList,
      nutritionalInfo,
      allergens,
      dietaryInfo,
      customField
    });

    await product.save();

    console.log("✅ POST saved customField:", product.customField);

    res.status(201).json({
      product,
      commissionRate: effectiveCommission,
      isFreeMonth: isFree,
      freeMonthDescription: isFree ? getFreeMonthDescription() : null,
      message: isFree ?
        `Product added with 0% commission (${getFreeMonthDescription()})` :
        `Product added with ${effectiveCommission}% commission`
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================================
// 🆕 UPDATE PRODUCT — uses $set, persists everything
// ============================================================
router.put("/:id", auth, imageUpload.fields([
  { name: "images", maxCount: 10 },
  { name: "variantImages", maxCount: 50 }
]), async (req, res) => {
  try {
    const newMainImages = sortByOriginalName(req.files?.images);
    const variantImagePaths = (req.files?.variantImages || []).map(f => `/uploads/${f.filename}`);

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const dimensions = {
      length: parseFloat(req.body['dimensions[length]']) || 0,
      width: parseFloat(req.body['dimensions[width]']) || 0,
      height: parseFloat(req.body['dimensions[height]']) || 0,
      unit: req.body['dimensions[unit]'] || 'cm'
    };

    const shippingTime = req.body.shippingTime || '3-5 days';
    const customShippingTime = req.body.customShippingTime || '';
    const shippingCharge = parseFloat(req.body.shippingCharge) || 0;
    const isFreeShipping = req.body.isFreeShipping === 'true' || req.body.isFreeShipping === true;
    const minDays = parseInt(req.body['estimatedDeliveryDays[min]']) || 3;
    const maxDays = parseInt(req.body['estimatedDeliveryDays[max]']) || 5;

    const ingredients = req.body.ingredients || "";
    const ingredientsList = req.body.ingredientsList ?
      (Array.isArray(req.body.ingredientsList) ? req.body.ingredientsList : req.body.ingredientsList.split(',').map(i => i.trim())) : [];

    const nutritionalInfo = {
      servingSize: req.body['nutritionalInfo[servingSize]'] || "",
      calories: parseFloat(req.body['nutritionalInfo[calories]']) || 0,
      protein: parseFloat(req.body['nutritionalInfo[protein]']) || 0,
      carbohydrates: parseFloat(req.body['nutritionalInfo[carbohydrates]']) || 0,
      fat: parseFloat(req.body['nutritionalInfo[fat]']) || 0,
      sugar: parseFloat(req.body['nutritionalInfo[sugar]']) || 0,
      fiber: parseFloat(req.body['nutritionalInfo[fiber]']) || 0,
      sodium: parseFloat(req.body['nutritionalInfo[sodium]']) || 0
    };

    const allergens = req.body.allergens ?
      (Array.isArray(req.body.allergens) ? req.body.allergens : req.body.allergens.split(',').map(a => a.trim())) : [];

    const dietaryInfo = {
      isVegetarian: req.body['dietaryInfo[isVegetarian]'] === 'true' || req.body['dietaryInfo[isVegetarian]'] === true,
      isVegan: req.body['dietaryInfo[isVegan]'] === 'true' || req.body['dietaryInfo[isVegan]'] === true,
      isGlutenFree: req.body['dietaryInfo[isGlutenFree]'] === 'true' || req.body['dietaryInfo[isGlutenFree]'] === true,
      isDairyFree: req.body['dietaryInfo[isDairyFree]'] === 'true' || req.body['dietaryInfo[isDairyFree]'] === true,
      isNutFree: req.body['dietaryInfo[isNutFree]'] === 'true' || req.body['dietaryInfo[isNutFree]'] === true,
      isOrganic: req.body['dietaryInfo[isOrganic]'] === 'true' || req.body['dietaryInfo[isOrganic]'] === true
    };

    const customField = parseCustomField(req.body);

    const { categories, categorySubcategoryMap } = parseMultiCategoryData(req.body);

    let subcategories = parseSubcategories(
      req.body.subcategories || req.body.subCategories || req.body.subcategory
    );

    if (Object.keys(categorySubcategoryMap).length > 0) {
      const fromMap = [];
      Object.values(categorySubcategoryMap).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(s => {
            const val = cleanSubcategoryString(s);
            if (val && !fromMap.includes(val)) fromMap.push(val);
          });
        }
      });
      if (fromMap.length > 0) subcategories = fromMap;
    }

    const subcategory = subcategories[0] || "";

    const variants = parseVariants(req.body.variants, variantImagePaths);

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      categories,
      categorySubcategoryMap,
      subcategory,
      subcategories,
      variants,
      stock: parseInt(req.body.stock) || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      company: vendor.company,
      vendorId: req.user.id,
      size: req.body.size || "",
      weight: parseFloat(req.body.weight) || 0,
      weightUnit: req.body.weightUnit || "",
      sku: req.body.sku || "",
      variant: req.body.variant || "",
      dimensions,
      shippingTime,
      customShippingTime,
      estimatedDeliveryDays: { min: minDays, max: maxDays },
      shippingCharge,
      isFreeShipping,
      ingredients,
      ingredientsList,
      nutritionalInfo,
      allergens,
      dietaryInfo,
      customField
    };

    // 🆕 IMAGE 4-CASE LOGIC
    let existingImages = null;
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        console.error("Error parsing existingImages:", e);
        existingImages = null;
      }
    }

    console.log("📸 PUT images debug:", {
      existingImagesCount: Array.isArray(existingImages) ? existingImages.length : 0,
      newMainImagesCount: newMainImages.length
    });

    if (Array.isArray(existingImages) && newMainImages.length > 0) {
      updateData.image = [...existingImages, ...newMainImages];
      console.log("✅ Case 1: merge existing + new");
    }
    else if (Array.isArray(existingImages) && newMainImages.length === 0) {
      updateData.image = existingImages;
      console.log("✅ Case 2: existing reordered only");
    }
    else if (newMainImages.length > 0) {
      updateData.image = newMainImages;
      console.log("✅ Case 3: new images only");
    }
    else {
      console.log("⏭️ Case 4: no image change");
    }

    // ✅ FIX: Use $set explicitly so mongoose treats everything as one update.
    // Also bypasses model pre-hook mutation issues.
    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Product not found" });

    console.log("✅ PUT saved customField:", updated.customField);

    const effectiveCommission = getEffectiveCommissionRate(vendor);
    res.json({
      product: updated,
      commissionRate: effectiveCommission,
      isFreeMonth: isCurrentMonthFree(),
      message: "Product updated successfully"
    });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// BULK UPLOAD VALIDATE
// ============================================================
router.post("/bulk-upload/validate", auth, bulkUpload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Please upload an Excel file" });

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(fileExt)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Please upload a valid Excel file (.xlsx or .xls)" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    fs.unlinkSync(req.file.path);

    if (data.length === 0) return res.status(400).json({ success: false, message: "Excel file is empty" });

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const existingCategories = await Product.distinct("category", { company: vendor.company });
    const allCategories = [...existingCategories, "Uncategorized"];

    const validationResults = {
      totalRows: data.length, validRows: [], invalidRows: [], errors: [], warnings: [],
      summary: { valid: 0, invalid: 0, warning: 0, total: data.length, successRate: "0%" },
      preview: []
    };

    const columnMap = {
      name: ['Name*', 'Name', 'name', 'productName'],
      description: ['Description', 'description', 'Desc'],
      price: ['Price*', 'Price', 'price'],
      category: ['Category*', 'Category', 'category'],
      subcategory: ['SubCategory', 'Sub Category', 'subCategory', 'subcategory', 'Sub-Category', 'sub-category'],
      subcategories: ['SubCategories', 'Sub Categories', 'subCategories', 'subcategories', 'Sub-Categories'],
      stock: ['Stock', 'stock'],
      size: ['Size', 'size'],
      weight: ['Weight', 'weight'],
      weightUnit: ['WeightUnit', 'weightUnit', 'Weight Unit'],
      sku: ['SKU', 'sku'],
      variant: ['Variant', 'variant'],
      variantColors: ['VariantColors', 'Variant Colors', 'variantColors', 'Colors', 'colors'],
      variantSizes: ['VariantSizes', 'Variant Sizes', 'variantSizes', 'Sizes', 'sizes'],
      variantStocks: ['VariantStocks', 'Variant Stocks', 'variantStocks', 'Variant Stock'],
      variantPrices: ['VariantPrices', 'Variant Prices', 'variantPrices', 'Variant Price'],
      variantImages: ['VariantImages', 'Variant Images', 'variantImages', 'Variant Image'],
      length: ['Length', 'length'],
      width: ['Width', 'width'],
      height: ['Height', 'height'],
      dimensionUnit: ['DimensionUnit', 'dimensionUnit', 'Dimension Unit'],
      images: ['Images', 'images', 'Image', 'image'],
      status: ['Status', 'status'],
      shippingTime: ['Shipping Time', 'ShippingTime', 'shippingTime', 'Delivery Time', 'DeliveryTime'],
      customShippingTime: ['Custom Shipping Time', 'CustomShippingTime', 'customShippingTime'],
      minDeliveryDays: ['Min Delivery Days', 'MinDeliveryDays', 'minDeliveryDays', 'Min Days'],
      maxDeliveryDays: ['Max Delivery Days', 'MaxDeliveryDays', 'maxDeliveryDays', 'Max Days'],
      shippingCharge: ['Shipping Charge', 'ShippingCharge', 'shippingCharge', 'Delivery Charge'],
      isFreeShipping: ['Free Shipping', 'FreeShipping', 'isFreeShipping', 'Free Delivery'],
      ingredients: ['Ingredients', 'ingredients'],
      ingredientsList: ['Ingredients List', 'ingredientsList', 'Detailed Ingredients'],
      allergens: ['Allergens', 'allergens'],
      servingSize: ['Serving Size', 'servingSize'],
      calories: ['Calories', 'calories'],
      protein: ['Protein', 'protein'],
      carbohydrates: ['Carbohydrates', 'carbohydrates', 'Carbs'],
      fat: ['Fat', 'fat'],
      sugar: ['Sugar', 'sugar'],
      fiber: ['Fiber', 'fiber'],
      sodium: ['Sodium', 'sodium'],
      isVegetarian: ['Vegetarian', 'isVegetarian'],
      isVegan: ['Vegan', 'isVegan'],
      isGlutenFree: ['Gluten Free', 'isGlutenFree', 'Gluten-Free'],
      isDairyFree: ['Dairy Free', 'isDairyFree', 'Dairy-Free'],
      isNutFree: ['Nut Free', 'isNutFree', 'Nut-Free'],
      isOrganic: ['Organic', 'isOrganic'],
      customFieldEnabled: ['CustomFieldEnabled', 'Custom Field Enabled'],
      customFieldLabel: ['CustomFieldLabel', 'Custom Field Label'],
      customFieldValue: ['CustomFieldValue', 'Custom Field Value']
    };

    data.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors = [];
      const rowWarnings = [];

      const name = getRowValue(row, columnMap.name);
      const price = getRowValue(row, columnMap.price);
      const category = getRowValue(row, columnMap.category);
      const subcategoryRaw = getRowValue(row, columnMap.subcategory) || "";
      const subcategoriesRaw = getRowValue(row, columnMap.subcategories) || "";

      const subcategories = parseSubcategories(subcategoriesRaw);
      const subcategory = cleanSubcategoryString(subcategoryRaw) || subcategories[0] || "";

      const variantColors = (getRowValue(row, columnMap.variantColors) || "").toString().split(",").map(s => s.trim()).filter(s => s);
      const variantSizes = (getRowValue(row, columnMap.variantSizes) || "").toString().split(",").map(s => s.trim()).filter(s => s);
      const variantStocks = (getRowValue(row, columnMap.variantStocks) || "").toString().split(",").map(s => s.trim()).filter(s => s);
      const variantPrices = (getRowValue(row, columnMap.variantPrices) || "").toString().split(",").map(s => s.trim()).filter(s => s);
      const variantImages = (getRowValue(row, columnMap.variantImages) || "").toString().split(",").map(s => s.trim()).filter(s => s);

      const variants = [];
      const maxVariants = Math.max(variantColors.length, variantSizes.length, variantImages.length);
      for (let i = 0; i < maxVariants; i++) {
        variants.push({
          color: variantColors[i] || "",
          size: variantSizes[i] || "",
          stock: parseInt(variantStocks[i]) || 0,
          price: parseFloat(variantPrices[i]) || 0,
          image: variantImages[i] || "",
          isAvailable: true
        });
      }

      if (!name || name.toString().trim() === '') rowErrors.push("Name is required");
      if (!price || price.toString().trim() === '') {
        rowErrors.push("Price is required");
      } else if (parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
        rowErrors.push("Price must be a positive number");
      }
      if (!category || category.toString().trim() === '') rowErrors.push("Category is required");
      else if (!allCategories.includes(category.toString().trim()) && !category.toString().toLowerCase().includes('uncategorized')) {
        rowWarnings.push(`Category "${category}" may not exist in admin system`);
      }

      const rowData = {
        rowNumber,
        data: {
          name, price, category, subcategory, subcategories, variants,
          stock: getRowValue(row, columnMap.stock) || 0,
          size: getRowValue(row, columnMap.size) || "",
          weight: getRowValue(row, columnMap.weight) || 0,
          weightUnit: getRowValue(row, columnMap.weightUnit) || "",
          sku: getRowValue(row, columnMap.sku) || "",
          variant: getRowValue(row, columnMap.variant) || "",
          length: getRowValue(row, columnMap.length) || 0,
          width: getRowValue(row, columnMap.width) || 0,
          height: getRowValue(row, columnMap.height) || 0,
          dimensionUnit: getRowValue(row, columnMap.dimensionUnit) || "cm",
          images: getRowValue(row, columnMap.images) || "",
          status: getRowValue(row, columnMap.status) || "active",
          shippingTime: getRowValue(row, columnMap.shippingTime) || '3-5 days',
          customShippingTime: getRowValue(row, columnMap.customShippingTime) || '',
          minDeliveryDays: parseInt(getRowValue(row, columnMap.minDeliveryDays)) || 3,
          maxDeliveryDays: parseInt(getRowValue(row, columnMap.maxDeliveryDays)) || 5,
          shippingCharge: parseFloat(getRowValue(row, columnMap.shippingCharge)) || 0,
          isFreeShipping: getRowValue(row, columnMap.isFreeShipping) || 'yes',
          ingredients: getRowValue(row, columnMap.ingredients) || '',
          ingredientsList: getRowValue(row, columnMap.ingredientsList) || '',
          allergens: getRowValue(row, columnMap.allergens) || '',
          servingSize: getRowValue(row, columnMap.servingSize) || '',
          calories: parseFloat(getRowValue(row, columnMap.calories)) || 0,
          protein: parseFloat(getRowValue(row, columnMap.protein)) || 0,
          carbohydrates: parseFloat(getRowValue(row, columnMap.carbohydrates)) || 0,
          fat: parseFloat(getRowValue(row, columnMap.fat)) || 0,
          sugar: parseFloat(getRowValue(row, columnMap.sugar)) || 0,
          fiber: parseFloat(getRowValue(row, columnMap.fiber)) || 0,
          sodium: parseFloat(getRowValue(row, columnMap.sodium)) || 0,
          isVegetarian: getRowValue(row, columnMap.isVegetarian) || 'no',
          isVegan: getRowValue(row, columnMap.isVegan) || 'no',
          isGlutenFree: getRowValue(row, columnMap.isGlutenFree) || 'no',
          isDairyFree: getRowValue(row, columnMap.isDairyFree) || 'no',
          isNutFree: getRowValue(row, columnMap.isNutFree) || 'no',
          isOrganic: getRowValue(row, columnMap.isOrganic) || 'no',
          customFieldEnabled: getRowValue(row, columnMap.customFieldEnabled) || 'no',
          customFieldLabel: getRowValue(row, columnMap.customFieldLabel) || '',
          customFieldValue: getRowValue(row, columnMap.customFieldValue) || ''
        },
        errors: rowErrors,
        warnings: rowWarnings,
        isValid: rowErrors.length === 0
      };

      if (rowErrors.length === 0) validationResults.validRows.push(rowData);
      else validationResults.invalidRows.push(rowData);
      if (rowWarnings.length > 0) validationResults.warnings.push({ rowNumber, warnings: rowWarnings });
    });

    validationResults.summary = {
      valid: validationResults.validRows.length,
      invalid: validationResults.invalidRows.length,
      warning: validationResults.warnings.length,
      total: data.length,
      successRate: data.length > 0 ? `${Math.round((validationResults.validRows.length / data.length) * 100)}%` : "0%"
    };

    validationResults.preview = validationResults.validRows.slice(0, 5).map(row => ({
      name: row.data.name,
      price: row.data.price,
      category: row.data.category,
      subcategory: row.data.subcategory || "",
      variants: row.data.variants || [],
      stock: row.data.stock || 0
    }));

    validationResults.errors = validationResults.invalidRows.map(row =>
      `Row ${row.rowNumber}: ${row.errors.join(', ')}`
    );

    res.json({ success: true, data: validationResults });
  } catch (err) {
    console.error("Bulk upload validation error:", err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// BULK UPLOAD PROCESS
// ============================================================
router.post("/bulk-upload/process", auth, bulkUpload.fields([
  { name: "excelFile", maxCount: 1 },
  { name: "images", maxCount: 100 },
  { name: "variantImages", maxCount: 200 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.excelFile) {
      return res.status(400).json({ success: false, message: "Please upload an Excel file" });
    }

    const excelFile = req.files.excelFile[0];
    const fileExt = path.extname(excelFile.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(fileExt)) {
      fs.unlinkSync(excelFile.path);
      return res.status(400).json({ success: false, message: "Please upload a valid Excel file" });
    }

    const workbook = XLSX.readFile(excelFile.path);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    if (data.length === 0) {
      fs.unlinkSync(excelFile.path);
      return res.status(400).json({ success: false, message: "Excel file is empty" });
    }

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      fs.unlinkSync(excelFile.path);
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const effectiveCommission = getEffectiveCommissionRate(vendor);
    const isFree = isCurrentMonthFree();

    const uploadedImages = req.files.images || [];
    const uploadedVariantImages = req.files.variantImages || [];

    const uploadedImageMap = {};
    uploadedImages.forEach(file => {
      uploadedImageMap[file.originalname] = `/uploads/${file.filename}`;
    });

    const uploadedVariantImageMap = {};
    uploadedVariantImages.forEach(file => {
      uploadedVariantImageMap[file.originalname] = `/uploads/${file.filename}`;
    });

    const columnMap = {
      name: ['Name*', 'Name', 'name', 'productName'],
      description: ['Description', 'description', 'Desc'],
      price: ['Price*', 'Price', 'price'],
      category: ['Category*', 'Category', 'category'],
      subcategory: ['SubCategory', 'Sub Category', 'subCategory', 'subcategory', 'Sub-Category', 'sub-category'],
      subcategories: ['SubCategories', 'Sub Categories', 'subCategories', 'subcategories', 'Sub-Categories'],
      stock: ['Stock', 'stock'],
      size: ['Size', 'size'],
      weight: ['Weight', 'weight'],
      weightUnit: ['WeightUnit', 'weightUnit', 'Weight Unit'],
      sku: ['SKU', 'sku'],
      variant: ['Variant', 'variant'],
      variantColors: ['VariantColors', 'Variant Colors', 'variantColors', 'Colors'],
      variantSizes: ['VariantSizes', 'Variant Sizes', 'variantSizes', 'Sizes'],
      variantStocks: ['VariantStocks', 'Variant Stocks', 'variantStocks'],
      variantPrices: ['VariantPrices', 'Variant Prices', 'variantPrices'],
      variantImages: ['VariantImages', 'Variant Images', 'variantImages'],
      length: ['Length', 'length'],
      width: ['Width', 'width'],
      height: ['Height', 'height'],
      dimensionUnit: ['DimensionUnit', 'dimensionUnit', 'Dimension Unit'],
      images: ['Images', 'images', 'Image', 'image'],
      status: ['Status', 'status'],
      shippingTime: ['Shipping Time', 'ShippingTime', 'shippingTime', 'Delivery Time', 'DeliveryTime'],
      customShippingTime: ['Custom Shipping Time', 'CustomShippingTime', 'customShippingTime'],
      minDeliveryDays: ['Min Delivery Days', 'MinDeliveryDays', 'minDeliveryDays', 'Min Days'],
      maxDeliveryDays: ['Max Delivery Days', 'MaxDeliveryDays', 'maxDeliveryDays', 'Max Days'],
      shippingCharge: ['Shipping Charge', 'ShippingCharge', 'shippingCharge', 'Delivery Charge'],
      isFreeShipping: ['Free Shipping', 'FreeShipping', 'isFreeShipping', 'Free Delivery'],
      ingredients: ['Ingredients', 'ingredients'],
      ingredientsList: ['Ingredients List', 'ingredientsList', 'Detailed Ingredients'],
      allergens: ['Allergens', 'allergens'],
      servingSize: ['Serving Size', 'servingSize'],
      calories: ['Calories', 'calories'],
      protein: ['Protein', 'protein'],
      carbohydrates: ['Carbohydrates', 'carbohydrates', 'Carbs'],
      fat: ['Fat', 'fat'],
      sugar: ['Sugar', 'sugar'],
      fiber: ['Fiber', 'fiber'],
      sodium: ['Sodium', 'sodium'],
      isVegetarian: ['Vegetarian', 'isVegetarian'],
      isVegan: ['Vegan', 'isVegan'],
      isGlutenFree: ['Gluten Free', 'isGlutenFree', 'Gluten-Free'],
      isDairyFree: ['Dairy Free', 'isDairyFree', 'Dairy-Free'],
      isNutFree: ['Nut Free', 'isNutFree', 'Nut-Free'],
      isOrganic: ['Organic', 'isOrganic'],
      customFieldEnabled: ['CustomFieldEnabled', 'Custom Field Enabled'],
      customFieldLabel: ['CustomFieldLabel', 'Custom Field Label'],
      customFieldValue: ['CustomFieldValue', 'Custom Field Value']
    };

    const BATCH_SIZE = 50;
    const results = {
      totalRows: data.length, successfulRows: 0, failedRows: 0,
      products: [], errors: [], warnings: [],
      imagesUploaded: Object.keys(uploadedImageMap).length,
      variantImagesUploaded: Object.keys(uploadedVariantImageMap).length,
      imagesAssigned: 0,
      summary: { total: data.length, successful: 0, failed: 0, successRate: "0%" }
    };

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const productBatch = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNumber = i + j + 2;

        try {
          const name = getRowValue(row, columnMap.name);
          const price = getRowValue(row, columnMap.price);
          const category = getRowValue(row, columnMap.category);
          const subcategoryRaw = getRowValue(row, columnMap.subcategory) || "";
          const subcategoriesRaw = getRowValue(row, columnMap.subcategories) || "";

          const subcategories = parseSubcategories(subcategoriesRaw);
          const subcategory = cleanSubcategoryString(subcategoryRaw) || subcategories[0] || "";

          const variantColors = (getRowValue(row, columnMap.variantColors) || "").toString().split(",").map(s => s.trim()).filter(s => s);
          const variantSizes = (getRowValue(row, columnMap.variantSizes) || "").toString().split(",").map(s => s.trim()).filter(s => s);
          const variantStocks = (getRowValue(row, columnMap.variantStocks) || "").toString().split(",").map(s => s.trim()).filter(s => s);
          const variantPrices = (getRowValue(row, columnMap.variantPrices) || "").toString().split(",").map(s => s.trim()).filter(s => s);
          const variantImagesRaw = (getRowValue(row, columnMap.variantImages) || "").toString().split(",").map(s => s.trim()).filter(s => s);

          const variants = [];
          const maxVariants = Math.max(variantColors.length, variantSizes.length, variantImagesRaw.length);
          for (let v = 0; v < maxVariants; v++) {
            const imgName = variantImagesRaw[v] || "";
            let imgPath = "";
            if (imgName) {
              const baseName = path.basename(imgName);
              imgPath = uploadedVariantImageMap[baseName] || imgName;
            }
            variants.push({
              color: variantColors[v] || "",
              size: variantSizes[v] || "",
              stock: parseInt(variantStocks[v]) || 0,
              price: parseFloat(variantPrices[v]) || 0,
              image: imgPath,
              isAvailable: true
            });
          }

          let imagesArray = [];
          const imagesField = getRowValue(row, columnMap.images) || "";
          if (imagesField && imagesField.toString().trim()) {
            const imageNames = imagesField.toString().split(',').map(img => img.trim()).filter(Boolean);
            for (const imgName of imageNames) {
              const baseName = path.basename(imgName);
              if (uploadedImageMap[baseName]) {
                imagesArray.push(uploadedImageMap[baseName]);
                results.imagesAssigned++;
              } else if (imgName.startsWith('/uploads/')) {
                imagesArray.push(imgName);
              } else if (imgName.startsWith('http')) {
                imagesArray.push(imgName);
              }
            }
          }

          if (!name || name.toString().trim() === '') {
            results.errors.push(`Row ${rowNumber}: Product name is required`);
            results.failedRows++;
            continue;
          }

          const priceNum = parseFloat(price);
          if (isNaN(priceNum) || priceNum <= 0) {
            results.errors.push(`Row ${rowNumber}: Valid price is required`);
            results.failedRows++;
            continue;
          }

          const categoryStr = category ? category.toString().trim() : "Uncategorized";
          const isActive = (getRowValue(row, columnMap.status) || "active").toString().toLowerCase() === 'active';

          const cfEnabledRaw = (getRowValue(row, columnMap.customFieldEnabled) || 'no').toString().toLowerCase();
          const cfLabel = (getRowValue(row, columnMap.customFieldLabel) || '').toString().trim();
          const cfValue = (getRowValue(row, columnMap.customFieldValue) || '').toString().trim();
          const cfEnabled = ['yes', 'true'].includes(cfEnabledRaw) && cfLabel.length > 0 && cfValue.length > 0;

          const productData = {
            name: name.toString().trim(),
            description: getRowValue(row, columnMap.description) || "",
            price: priceNum,
            category: categoryStr,
            categories: [categoryStr],
            categorySubcategoryMap: subcategory ? { [categoryStr]: subcategories.length > 0 ? subcategories : [subcategory] } : {},
            subcategory,
            subcategories,
            variants,
            image: imagesArray.length > 0 ? imagesArray : [],
            company: vendor.company,
            vendorId: req.user.id,
            commission_rate: effectiveCommission,
            stock: parseInt(getRowValue(row, columnMap.stock)) || 0,
            isActive,
            size: getRowValue(row, columnMap.size) || "",
            weight: parseFloat(getRowValue(row, columnMap.weight)) || 0,
            weightUnit: getRowValue(row, columnMap.weightUnit) || "",
            sku: getRowValue(row, columnMap.sku) || "",
            variant: getRowValue(row, columnMap.variant) || "",
            dimensions: {
              length: parseFloat(getRowValue(row, columnMap.length)) || 0,
              width: parseFloat(getRowValue(row, columnMap.width)) || 0,
              height: parseFloat(getRowValue(row, columnMap.height)) || 0,
              unit: getRowValue(row, columnMap.dimensionUnit) || "cm"
            },
            shippingTime: getRowValue(row, columnMap.shippingTime) || '3-5 days',
            customShippingTime: getRowValue(row, columnMap.customShippingTime) || '',
            estimatedDeliveryDays: {
              min: parseInt(getRowValue(row, columnMap.minDeliveryDays)) || 3,
              max: parseInt(getRowValue(row, columnMap.maxDeliveryDays)) || 5
            },
            shippingCharge: parseFloat(getRowValue(row, columnMap.shippingCharge)) || 0,
            isFreeShipping: ['yes', 'true'].includes((getRowValue(row, columnMap.isFreeShipping) || 'yes').toString().toLowerCase()),
            ingredients: getRowValue(row, columnMap.ingredients) || '',
            ingredientsList: (getRowValue(row, columnMap.ingredientsList) || '').split(',').map(i => i.trim()).filter(i => i),
            allergens: (getRowValue(row, columnMap.allergens) || '').split(',').map(a => a.trim()).filter(a => a),
            nutritionalInfo: {
              servingSize: getRowValue(row, columnMap.servingSize) || '',
              calories: parseFloat(getRowValue(row, columnMap.calories)) || 0,
              protein: parseFloat(getRowValue(row, columnMap.protein)) || 0,
              carbohydrates: parseFloat(getRowValue(row, columnMap.carbohydrates)) || 0,
              fat: parseFloat(getRowValue(row, columnMap.fat)) || 0,
              sugar: parseFloat(getRowValue(row, columnMap.sugar)) || 0,
              fiber: parseFloat(getRowValue(row, columnMap.fiber)) || 0,
              sodium: parseFloat(getRowValue(row, columnMap.sodium)) || 0
            },
            dietaryInfo: {
              isVegetarian: ['yes', 'true'].includes((getRowValue(row, columnMap.isVegetarian) || 'no').toString().toLowerCase()),
              isVegan: ['yes', 'true'].includes((getRowValue(row, columnMap.isVegan) || 'no').toString().toLowerCase()),
              isGlutenFree: ['yes', 'true'].includes((getRowValue(row, columnMap.isGlutenFree) || 'no').toString().toLowerCase()),
              isDairyFree: ['yes', 'true'].includes((getRowValue(row, columnMap.isDairyFree) || 'no').toString().toLowerCase()),
              isNutFree: ['yes', 'true'].includes((getRowValue(row, columnMap.isNutFree) || 'no').toString().toLowerCase()),
              isOrganic: ['yes', 'true'].includes((getRowValue(row, columnMap.isOrganic) || 'no').toString().toLowerCase())
            },
            customField: {
              enabled: cfEnabled,
              label: cfEnabled ? cfLabel : "",
              value: cfEnabled ? cfValue : ""
            }
          };

          productBatch.push(productData);
          results.successfulRows++;
        } catch (err) {
          results.errors.push(`Row ${rowNumber}: ${err.message}`);
          results.failedRows++;
        }
      }

      if (productBatch.length > 0) {
        const inserted = await Product.insertMany(productBatch);
        results.products.push(...inserted);
      }
    }

    fs.unlinkSync(excelFile.path);

    results.summary = {
      total: results.totalRows,
      successful: results.successfulRows,
      failed: results.failedRows,
      successRate: results.totalRows > 0 ? `${Math.round((results.successfulRows / results.totalRows) * 100)}%` : "0%"
    };

    res.status(201).json({
      success: true,
      message: `${results.successfulRows} products uploaded successfully`,
      summary: results.summary,
      products: results.products.map(p => ({
        id: p._id, name: p.name, price: p.price, category: p.category,
        subcategory: p.subcategory || "",
        subcategories: p.subcategories || [],
        variants: p.variants || [],
        stock: p.stock,
        imageCount: p.image ? p.image.length : 0
      })),
      images: {
        uploaded: results.imagesUploaded,
        variantImagesUploaded: results.variantImagesUploaded,
        assigned: results.imagesAssigned
      },
      commissionRate: effectiveCommission,
      isFreeMonth: isFree,
      errors: results.errors.length > 0 ? results.errors : undefined,
      warnings: results.warnings.length > 0 ? results.warnings : undefined
    });

  } catch (err) {
    console.error("Bulk upload processing error:", err);
    if (req.files && req.files.excelFile && fs.existsSync(req.files.excelFile[0].path)) {
      fs.unlinkSync(req.files.excelFile[0].path);
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// TEMPLATE DOWNLOAD
// ============================================================
router.get("/download-template", auth, (req, res) => {
  try {
    const templateData = [
      {
        "Name*": "Cotton T-Shirt",
        "Description": "Premium cotton t-shirt",
        "Price*": 599,
        "Category*": "Clothing",
        "SubCategory": "T-Shirts",
        "SubCategories": "T-Shirts, Casual",
        "VariantColors": "Red, Blue",
        "VariantSizes": "M, L",
        "VariantStocks": "25, 10",
        "VariantPrices": "599, 649",
        "VariantImages": "red.jpg, blue.jpg",
        "Stock": 35,
        "Size": "M",
        "Weight": 200,
        "WeightUnit": "g",
        "SKU": "TS-001",
        "Variant": "",
        "Length": 30,
        "Width": 20,
        "Height": 2,
        "DimensionUnit": "cm",
        "Images": "main1.jpg, main2.jpg",
        "Status": "active",
        "Shipping Time": "3-5 days",
        "Custom Shipping Time": "",
        "Min Delivery Days": 3,
        "Max Delivery Days": 5,
        "Shipping Charge": 0,
        "Free Shipping": "yes",
        "Ingredients": "",
        "Ingredients List": "",
        "Allergens": "",
        "Serving Size": "",
        "Calories": 0,
        "Protein": 0,
        "Carbohydrates": 0,
        "Fat": 0,
        "Sugar": 0,
        "Fiber": 0,
        "Sodium": 0,
        "Vegetarian": "no",
        "Vegan": "no",
        "Gluten Free": "no",
        "Dairy Free": "no",
        "Nut Free": "no",
        "Organic": "no",
        "CustomFieldEnabled": "no",
        "CustomFieldLabel": "",
        "CustomFieldValue": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 25 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 50 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 50 }, { wch: 50 },
      { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const instructions = [
      { "Field": "Name*", "Description": "Product name (required)", "Example": "Cotton T-Shirt" },
      { "Field": "Price*", "Description": "Product price (required)", "Example": "599" },
      { "Field": "Category*", "Description": "Product category (required)", "Example": "Clothing" },
      { "Field": "SubCategory", "Description": "Primary sub-category", "Example": "T-Shirts" },
      { "Field": "SubCategories", "Description": "Multiple sub-categories (comma-separated)", "Example": "T-Shirts, Casual" },
      { "Field": "VariantColors", "Description": "Variant colors (comma-separated, matched by position)", "Example": "Red, Blue, Green" },
      { "Field": "VariantSizes", "Description": "Variant sizes (comma-separated, matched by position)", "Example": "S, M, L" },
      { "Field": "VariantStocks", "Description": "Variant stocks (comma-separated, matched by position)", "Example": "25, 10, 5" },
      { "Field": "VariantPrices", "Description": "Variant prices (comma-separated, optional)", "Example": "599, 649, 699" },
      { "Field": "VariantImages", "Description": "Variant image filenames (comma-separated, matched by position).", "Example": "red.jpg, blue.jpg" },
      { "Field": "Images", "Description": "Main product image filenames (comma-separated)", "Example": "main1.jpg, main2.jpg" },
      { "Field": "Stock", "Description": "Total stock (if not using variants)", "Example": "50" },
      { "Field": "Shipping Time", "Description": "1-2 days, 2-3 days, 3-5 days, 5-7 days, Custom", "Example": "3-5 days" },
      { "Field": "Free Shipping", "Description": "yes/no", "Example": "yes" },
      { "Field": "Status", "Description": "active/inactive", "Example": "active" },
      { "Field": "CustomFieldEnabled", "Description": "yes/no — Enable custom field for this product", "Example": "yes" },
      { "Field": "CustomFieldLabel", "Description": "Label for custom field (required if enabled)", "Example": "Care Instructions" },
      { "Field": "CustomFieldValue", "Description": "Value/text for custom field (required if enabled)", "Example": "Hand wash only" }
    ];

    const instructionSheet = XLSX.utils.json_to_sheet(instructions);
    instructionSheet['!cols'] = [{ wch: 22 }, { wch: 65 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=product_bulk_upload_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (err) {
    console.error("Error downloading template:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// COMMISSION INFO
// ============================================================
router.get("/commission-info", auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    const effectiveCommission = getEffectiveCommissionRate(vendor);
    res.json({
      success: true,
      commissionRate: effectiveCommission,
      isFreeMonth: isCurrentMonthFree(),
      freeMonthDescription: getFreeMonthDescription(),
      plan: vendor.plan,
      planDetails: getVendorPlanDetails(vendor)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/all-categories", auth, async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json({
      success: true,
      categories: categories.map(cat => ({ _id: cat, name: cat }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/my-categories", auth, async (req, res) => {
  try {
    const categories = await Product.distinct("category", { company: req.user.company });
    res.json(Array.isArray(categories) ? categories : []);
  } catch (err) {
    res.status(500).json([]);
  }
});

// ============================================================
// GET SINGLE PRODUCT
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// DELETE
// ============================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// STOCK UPDATE
// ============================================================
router.patch("/product/:id/stock", auth, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock === null || stock < 0) {
      return res.status(400).json({ success: false, message: "Valid stock required" });
    }
    const updated = await Product.findByIdAndUpdate(req.params.id, { stock: parseInt(stock) }, { new: true });
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// IMAGE UPLOAD
// ============================================================
router.post("/upload-image", auth, imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file" });
    const imagePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { filename: req.file.filename, path: imagePath } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/upload-images", auth, imageUpload.array("images", 10), async (req, res) => {
  try {
    const uploadedImages = req.files.map(file => ({
      filename: file.filename,
      path: `/uploads/${file.filename}`
    }));
    res.json({ success: true, data: uploadedImages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;