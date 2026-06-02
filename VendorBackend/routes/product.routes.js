const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const Category = require("../models/Category");
// ================= MULTER SETUP =================
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

const upload = multer({ storage });

/* =====================================================
   ✅ USER SIDE – GET ALL PRODUCTS (WITH IMAGES)
===================================================== */
/* =====================================================
   ✅ GET ALL CATEGORIES FOR DROPDOWN
===================================================== */
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
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching all products:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   ✅ VENDOR – GET HIS CATEGORIES (MUST BE BEFORE /:id)
===================================================== */
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

/* =====================================================
   ✅ VENDOR – GET ONLY HIS PRODUCTS (MUST BE BEFORE /:id)
===================================================== */
router.get("/my-products", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(400).json({ message: "User company not found" });
    }
    
    const products = await Product.find({
      company: req.user.company,
    });
    
    res.json(products);
  } catch (err) {
    console.error("Error fetching my products:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   ✅ VENDOR – DOWNLOAD EXCEL TEMPLATE WITH MULTIPLE IMAGES
===================================================== */
router.get("/download-template", auth, (req, res) => {
  try {
    const templateData = [
      {
        "Name": "Sample Product 1",
        "Description": "This is a sample product description",
        "Price": 99.99,
        "Category": "Electronics",
        "Images": "/uploads/sample-image1.jpg, /uploads/sample-image2.jpg, /uploads/sample-image3.jpg"
      },
      {
        "Name": "Sample Product 2",
        "Description": "Another sample product",
        "Price": 49.99,
        "Category": "Clothing",
        "Images": "/uploads/sample-image1.jpg"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // Name
      { wch: 40 }, // Description
      { wch: 12 }, // Price
      { wch: 15 }, // Category
      { wch: 50 }  // Images (comma-separated paths)
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

/* =====================================================
   ✅ VENDOR – BULK UPLOAD PRODUCTS FROM EXCEL (WITH MULTIPLE IMAGES)
===================================================== */
router.post("/bulk-upload", auth, upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Excel file is empty" });
    }

    const products = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Extract images - handle multiple formats: "Images", "images", "Image", "image"
      let imagesField = row.Images || row.images || row.Image || row.image || "";
      
      // Parse comma-separated image paths into array
      let imagesArray = [];
      if (typeof imagesField === 'string' && imagesField.trim()) {
        imagesArray = imagesField
          .split(',')
          .map(img => img.trim())
          .filter(img => img.length > 0);
      } else if (Array.isArray(imagesField)) {
        imagesArray = imagesField;
      }
      
      const productData = {
        name: row.Name || row.name || row.productName,
        description: row.Description || row.description || "",
        price: parseFloat(row.Price || row.price || 0),
        category: row.Category || row.category || "Uncategorized",
        image: imagesArray, // Now supports multiple images as array
        company: req.user.company,
      };

      // Validation
      if (!productData.name) {
        errors.push(`Row ${i + 2}: Product name is required`);
        continue;
      }

      if (isNaN(productData.price) || productData.price <= 0) {
        errors.push(`Row ${i + 2}: Valid price is required`);
        continue;
      }

      // Optional: Validate image paths format (just warning)
      if (productData.image && productData.image.length > 0) {
        const invalidPaths = productData.image.filter(img => 
          typeof img !== 'string' || (!img.startsWith('/uploads/') && !img.startsWith('http'))
        );
        if (invalidPaths.length > 0) {
          errors.push(`Row ${i + 2}: Some image paths may be invalid: ${invalidPaths.join(', ')}`);
        }
      }

      products.push(productData);
    }

    if (products.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        message: "No valid products found in Excel file",
        errors: errors 
      });
    }

    const insertedProducts = await Product.insertMany(products);
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: `${insertedProducts.length} products uploaded successfully`,
      products: insertedProducts,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: data.length,
      successfulRows: insertedProducts.length,
      failedRows: errors.length
    });

  } catch (err) {
    console.error("Bulk upload error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   ✅ USER SIDE – GET SINGLE PRODUCT BY ID
===================================================== */
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

/* =====================================================
   ✅ VENDOR – ADD PRODUCT WITH MULTIPLE IMAGES
===================================================== */
router.post("/", auth, upload.array("images", 10), async (req, res) => {
  try {
    const imagePaths = req.files?.map(
      (file) => `/uploads/${file.filename}`
    ) || [];

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      image: imagePaths,
      company: req.user.company,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(400).json({ message: err.message });
  }
});

/* =====================================================
   ✅ VENDOR – UPDATE PRODUCT (OPTIONAL MULTIPLE IMAGES UPDATE)
===================================================== */
router.put("/:id", auth, upload.array("images", 10), async (req, res) => {
  try {
    const imagePaths = req.files?.length > 0
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : undefined;

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
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

    res.json(updated);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   ✅ VENDOR – DELETE PRODUCT
===================================================== */
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

module.exports = router;