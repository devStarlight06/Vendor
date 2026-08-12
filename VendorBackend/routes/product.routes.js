// routes/product.routes.js - COMPLETE WITH IMAGE UPLOADER
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const auth = require("../middleware/auth");

// ============================================================
// MULTER SETUP FOR PRODUCT IMAGES
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed!"));
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

const checkVendorStatus = async (req, res, next) => {
  const vendor = await Vendor.findById(req.user.id);
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });
  
  if (vendor.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: "Your account is suspended. Please contact admin.",
      status: 'suspended',
      reason: vendor.suspensionReason
    });
  }
  
  next();
};

// ============================================================
// HELPER: Get commission rate from vendor plan
// ============================================================
const getCommissionRate = async (vendorId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) return 5;

  const COMMISSION_MAP = {
    'founding': 0,
    'growth': 8,
    'premium': 3
  };

  if (vendor.plan === 'founding') {
    const now = new Date();
    const threeMonthsLater = new Date(vendor.planUpdatedAt || vendor.createdAt);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const isOfferActive = now <= threeMonthsLater || (vendor.totalOrders || 0) < 10;
    return isOfferActive ? 0 : 10;
  }

  return COMMISSION_MAP[vendor.plan] || 5;
};

// ============================================================
// GET VENDOR PLAN & COMMISSION INFO
// ============================================================
router.get("/my-plan", auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const commissionRate = await getCommissionRate(vendor._id);
    const PLAN_DETAILS = {
      'founding': {
        name: 'Founding 100',
        monthlyFee: 0,
        commissionRate: commissionRate,
        isOfferActive: commissionRate === 0,
        features: [
          'Seller storefront & order management',
          'Up to 50 product listings',
          '1 Homepage Feature/month',
          '2 Category Features/month',
          '1 Social Media Feature/month',
          'Seller Dashboard & Analytics',
          'Access to Seasonal Campaigns'
        ]
      },
      'growth': {
        name: 'Growth Seller',
        monthlyFee: 999,
        commissionRate: 8,
        isOfferActive: false,
        features: [
          'Up to 50 product listings',
          '2 Homepage Features/month',
          '4 Category Features/month',
          '2 Social Media Features/month',
          'Seller Dashboard & Analytics',
          'Order Management',
          'Access to Seasonal Campaigns'
        ]
      },
      'premium': {
        name: 'Premium Brand',
        monthlyFee: 2999,
        commissionRate: 3,
        isOfferActive: false,
        features: [
          'Unlimited Listings',
          '4 Homepage Features/month',
          '8 Category Features/month',
          '4 Social Media Features/month',
          'Newsletter Inclusion',
          'Advanced Analytics',
          'Priority Support'
        ]
      }
    };

    res.json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        company: vendor.company,
        plan: vendor.plan,
        status: vendor.status,
        planDetails: PLAN_DETAILS[vendor.plan] || PLAN_DETAILS['founding'],
        commissionRate: commissionRate,
        isOfferActive: commissionRate === 0
      }
    });
  } catch (err) {
    console.error("Error fetching vendor plan:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// USER SIDE – GET ALL PRODUCTS (WITH IMAGES)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching all products:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET ALL CATEGORIES FOR DROPDOWN
// ============================================================
router.get("/all-categories", auth, async (req, res) => {
  try {
    const categories = await Product.distinct("category");

    const categoryObjects = categories.map((cat) => ({
      _id: cat,
      name: cat,
    }));

    res.json({
      success: true,
      categories: categoryObjects,
    });

  } catch (err) {
    console.error("Error fetching all categories:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// VENDOR – GET HIS CATEGORIES
// ============================================================
router.get("/my-categories", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(400).json({ message: "User company not found" });
    }
    
    const categories = await Product.distinct("category", {
      company: req.user.company,
    });
    
    const categoryArray = Array.isArray(categories) ? categories : [];
    res.json(categoryArray);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json([]);
  }
});

// ============================================================
// VENDOR – GET HIS PRODUCTS WITH COMMISSION INFO
// ============================================================
router.get("/my-products", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(400).json({ message: "User company not found" });
    }
    
    const products = await Product.find({
      company: req.user.company,
    });
    
    const commissionRate = await getCommissionRate(req.user.id);
    
    res.json({
      products,
      commissionRate,
      plan: req.user.plan || 'founding'
    });
  } catch (err) {
    console.error("Error fetching my products:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// VENDOR – DOWNLOAD EXCEL TEMPLATE WITH SIZE/WEIGHT
// ============================================================
router.get("/download-template", auth, (req, res) => {
  try {
    const templateData = [
      {
        "Name": "Sample Product 1",
        "Description": "This is a sample product description",
        "Price": 99.99,
        "Category": "Electronics",
        "Stock": 10,
        "Size": "M",
        "Weight": 250,
        "WeightUnit": "g",
        "SKU": "PRD-001",
        "Variant": "Red",
        "Length": 10,
        "Width": 5,
        "Height": 2,
        "DimensionUnit": "cm",
        "Images": "/uploads/sample-image1.jpg, /uploads/sample-image2.jpg"
      },
      {
        "Name": "Sample Product 2",
        "Description": "Another sample product",
        "Price": 49.99,
        "Category": "Clothing",
        "Stock": 5,
        "Size": "L",
        "Weight": 0,
        "WeightUnit": "",
        "SKU": "PRD-002",
        "Variant": "Blue",
        "Length": 0,
        "Width": 0,
        "Height": 0,
        "DimensionUnit": "cm",
        "Images": "/uploads/sample-image1.jpg"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    worksheet['!cols'] = [
      { wch: 20 }, // Name
      { wch: 40 }, // Description
      { wch: 12 }, // Price
      { wch: 15 }, // Category
      { wch: 10 }, // Stock
      { wch: 10 }, // Size
      { wch: 10 }, // Weight
      { wch: 12 }, // WeightUnit
      { wch: 15 }, // SKU
      { wch: 15 }, // Variant
      { wch: 10 }, // Length
      { wch: 10 }, // Width
      { wch: 10 }, // Height
      { wch: 12 }, // DimensionUnit
      { wch: 50 }  // Images
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    res.setHeader("Content-Disposition", "attachment; filename=product_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (err) {
    console.error("Error downloading template:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// VENDOR – BULK UPLOAD PRODUCTS FROM EXCEL WITH IMAGE FILES
// ============================================================
router.post(
  "/bulk-upload",
  auth,
  upload.fields([
    { name: "excelFile", maxCount: 1 },
    { name: "images", maxCount: 50 }
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.excelFile) {
        return res.status(400).json({ message: "Please upload an Excel file" });
      }

      const excelFile = req.files.excelFile[0];
      const workbook = XLSX.readFile(excelFile.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        fs.unlinkSync(excelFile.path);
        return res.status(400).json({ message: "Excel file is empty" });
      }

      const vendor = await Vendor.findById(req.user.id);
      if (!vendor) {
        fs.unlinkSync(excelFile.path);
        return res.status(404).json({ message: "Vendor not found" });
      }

      const commissionRate = await getCommissionRate(req.user.id);

      const uploadedImages = req.files.images || [];
      const imagePaths = uploadedImages.map(
        (file) => `/uploads/${file.filename}`
      );

      const products = [];
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        let imagesArray = [];
        let imagesField = row.Images || row.images || row.Image || row.image || "";
        
        if (typeof imagesField === 'string' && imagesField.trim()) {
          imagesArray = imagesField
            .split(',')
            .map(img => img.trim())
            .filter(img => img.length > 0)
            .map(img => {
              if (!img.startsWith('/uploads/') && !img.startsWith('http')) {
                return `/uploads/${img}`;
              }
              return img;
            });
        } else if (uploadedImages.length > 0) {
          const imageIndex = i % uploadedImages.length;
          imagesArray = [`/uploads/${uploadedImages[imageIndex].filename}`];
        }

        const dimensions = {
          length: parseFloat(row.Length || row.length || 0),
          width: parseFloat(row.Width || row.width || 0),
          height: parseFloat(row.Height || row.height || 0),
          unit: row.DimensionUnit || row.dimensionUnit || 'cm'
        };

        let stock = parseInt(row.Stock || row.stock || 0);
        if (isNaN(stock)) stock = 0;

        const productData = {
          name: row.Name || row.name || row.productName,
          description: row.Description || row.description || "",
          price: parseFloat(row.Price || row.price || 0),
          category: row.Category || row.category || "Uncategorized",
          image: imagesArray.length > 0 ? imagesArray : [],
          company: vendor.company,
          vendorId: req.user.id,
          commission_rate: commissionRate,
          stock: stock,
          isActive: true,
          size: row.Size || row.size || "",
          weight: parseFloat(row.Weight || row.weight || 0),
          weightUnit: row.WeightUnit || row.weightUnit || "",
          sku: row.SKU || row.sku || "",
          variant: row.Variant || row.variant || "",
          dimensions: dimensions
        };

        if (!productData.name) {
          errors.push(`Row ${i + 2}: Product name is required`);
          continue;
        }

        if (isNaN(productData.price) || productData.price <= 0) {
          errors.push(`Row ${i + 2}: Valid price is required`);
          continue;
        }

        if (!productData.category) {
          errors.push(`Row ${i + 2}: Category is required`);
          continue;
        }

        products.push(productData);
      }

      if (products.length === 0) {
        fs.unlinkSync(excelFile.path);
        uploadedImages.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        return res.status(400).json({ 
          message: "No valid products found in Excel file",
          errors: errors 
        });
      }

      const insertedProducts = await Product.insertMany(products);
      fs.unlinkSync(excelFile.path);

      res.status(201).json({
        message: `${insertedProducts.length} products uploaded successfully`,
        products: insertedProducts,
        commissionRate: commissionRate,
        errors: errors.length > 0 ? errors : undefined,
        totalRows: data.length,
        successfulRows: insertedProducts.length,
        failedRows: errors.length,
        imagesUploaded: imagePaths.length,
        imagesAssigned: products.filter(p => p.image && p.image.length > 0).length
      });

    } catch (err) {
      console.error("Bulk upload error:", err);
      if (req.files) {
        if (req.files.excelFile && fs.existsSync(req.files.excelFile[0].path)) {
          fs.unlinkSync(req.files.excelFile[0].path);
        }
        if (req.files.images) {
          req.files.images.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          });
        }
      }
      res.status(500).json({ message: err.message });
    }
  }
);

// ============================================================
// GET SINGLE PRODUCT
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching single product:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// VENDOR – ADD PRODUCT WITH AUTO-COMMISSION AND SIZE/WEIGHT
// ============================================================
router.post("/", auth, upload.array("images", 10), async (req, res) => {
  try {
    const imagePaths = req.files?.map(
      (file) => `/uploads/${file.filename}`
    ) || [];

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    const commissionRate = await getCommissionRate(req.user.id);

    const dimensions = {
      length: parseFloat(req.body['dimensions[length]']) || 0,
      width: parseFloat(req.body['dimensions[width]']) || 0,
      height: parseFloat(req.body['dimensions[height]']) || 0,
      unit: req.body['dimensions[unit]'] || 'cm'
    };

    const product = new Product({
      name: req.body.name,
      description: req.body.description || "",
      price: req.body.price,
      category: req.body.category,
      image: imagePaths,
      company: vendor.company,
      vendorId: req.user.id,
      commission_rate: commissionRate,
      stock: parseInt(req.body.stock) || 0,
      isActive: true,
      size: req.body.size || "",
      weight: parseFloat(req.body.weight) || 0,
      weightUnit: req.body.weightUnit || "",
      sku: req.body.sku || "",
      variant: req.body.variant || "",
      dimensions: dimensions
    });

    await product.save();
    
    res.status(201).json({
      product,
      commissionRate,
      message: `Product added with ${commissionRate}% commission`
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================================
// VENDOR – UPDATE PRODUCT WITH SIZE/WEIGHT
// ============================================================
router.put("/:id", auth, upload.array("images", 10), async (req, res) => {
  try {
    const imagePaths = req.files?.length > 0
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : undefined;

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    const dimensions = {
      length: parseFloat(req.body['dimensions[length]']) || 0,
      width: parseFloat(req.body['dimensions[width]']) || 0,
      height: parseFloat(req.body['dimensions[height]']) || 0,
      unit: req.body['dimensions[unit]'] || 'cm'
    };

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      stock: parseInt(req.body.stock) || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      company: vendor.company,
      vendorId: req.user.id,
      size: req.body.size || "",
      weight: parseFloat(req.body.weight) || 0,
      weightUnit: req.body.weightUnit || "",
      sku: req.body.sku || "",
      variant: req.body.variant || "",
      dimensions: dimensions
    };

    if (imagePaths?.length > 0) {
      updateData.image = imagePaths;
    }
    
    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    const commissionRate = await getCommissionRate(req.user.id);

    res.json({
      product: updated,
      commissionRate,
      message: "Product updated successfully"
    });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// UPDATE PRODUCT STOCK (VENDOR)
// ============================================================
router.patch("/product/:id/stock", auth, async (req, res) => {
  try {
    const { stock } = req.body;
    const productId = req.params.id;

    if (stock === undefined || stock === null || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid stock quantity is required (must be >= 0)"
      });
    }

    const product = await Product.findOne({
      _id: productId,
      company: req.user.company,
      vendorId: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission"
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { stock: parseInt(stock) },
      { new: true }
    );

    res.json({
      success: true,
      message: "Stock updated successfully",
      product: updatedProduct
    });
  } catch (err) {
    console.error("Stock update error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// BULK STOCK UPDATE (VENDOR)
// ============================================================
router.patch("/bulk-stock", auth, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a list of product updates"
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const product = await Product.findOne({
          _id: update.productId,
          company: req.user.company,
          vendorId: req.user.id
        });

        if (!product) {
          errors.push({
            productId: update.productId,
            error: "Product not found or no permission"
          });
          continue;
        }

        const updated = await Product.findByIdAndUpdate(
          update.productId,
          { stock: parseInt(update.stock) },
          { new: true }
        );

        results.push(updated);
      } catch (err) {
        errors.push({
          productId: update.productId,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Updated ${results.length} products, ${errors.length} failed`,
      results,
      errors
    });
  } catch (err) {
    console.error("Bulk stock update error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ============================================================
// VENDOR – DELETE PRODUCT
// ============================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// IMAGE UPLOADER - UPLOAD SINGLE IMAGE
// ============================================================
router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded",
      });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        filename: req.file.filename,
        path: imagePath,
        url: `https://api.brandelvendor.starlighttechlabsindia.com${imagePath}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// IMAGE UPLOADER - UPLOAD MULTIPLE IMAGES
// ============================================================
router.post("/upload-images", auth, upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No image files uploaded",
      });
    }

    const uploadedImages = req.files.map((file) => ({
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      url: `https://api.brandelvendor.starlighttechlabsindia.com/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully`,
      data: uploadedImages,
    });
  } catch (err) {
    console.error("Multiple image upload error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// IMAGE UPLOADER - DELETE IMAGE
// ============================================================
router.delete("/image/:filename", auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, `../uploads/${filename}`);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    fs.unlinkSync(imagePath);

    // Also remove from product images if referenced
    await Product.updateMany(
      { vendorId: req.user.id, image: `/uploads/${filename}` },
      { $pull: { image: `/uploads/${filename}` } }
    );

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (err) {
    console.error("Image delete error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// IMAGE UPLOADER - LIST ALL IMAGES
// ============================================================
router.get("/images/list", auth, async (req, res) => {
  try {
    const uploadPath = path.join(__dirname, "../uploads");

    if (!fs.existsSync(uploadPath)) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const files = fs.readdirSync(uploadPath);
    const images = files
      .filter((file) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
      .map((file) => ({
        filename: file,
        path: `/uploads/${file}`,
        url: `https://api.brandelvendor.starlighttechlabsindia.com/uploads/${file}`,
        size: fs.statSync(path.join(uploadPath, file)).size,
        uploadedAt: fs.statSync(path.join(uploadPath, file)).mtime,
      }));

    res.status(200).json({
      success: true,
      data: images,
    });
  } catch (err) {
    console.error("Image list error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;