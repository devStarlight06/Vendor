// server.js - UPDATED WITH TEST ENDPOINT
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const reviewRoutes = require("./routes/reviewRoutes");
const sellerDocumentRoutes = require("./routes/sellerDocument.routes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const internalAuth = require("./middleware/internalAuth");

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3002',
    "https://vendor.native91.com",
    "https://native91.com",
    "https://admin.native91.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://api-vendor.native91.com",
    "http://localhost:5177",
    "http://localhost:7001"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log(err));

// ============================================================
// ✅ INTERNAL ROUTES WITH AUTH
// ============================================================
const internalRouter = express.Router();
internalRouter.use(internalAuth);

// ✅ TEST ENDPOINT - GET /api/internal/test
internalRouter.get('/test', (req, res) => {
  console.log('🔐 [INTERNAL] Test endpoint called');
  res.json({
    success: true,
    message: "Internal API is working!",
    timestamp: new Date().toISOString(),
    internalKey: process.env.INTERNAL_API_KEY ? 'Set' : 'Not Set'
  });
});

// Internal product thumbnail endpoint - POST /api/internal/productthumbnail
internalRouter.post('/productthumbnail', async (req, res) => {
  try {
    const { product_id, image_url } = req.body;
    const thumbnailService = require("./middleware/thumbnailService");
    
    console.log(`🔐 [INTERNAL] Thumbnail request for product: ${product_id}`);

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (!image_url) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const Product = require("./models/Product");
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.thumbnail_status === 'COMPLETED' && product.thumbnail_url) {
      console.log(`✅ Thumbnail already exists for product ${product_id}`);
      return res.status(200).json({
        success: true,
        message: 'Thumbnail already exists',
        thumbnail_url: product.thumbnail_url,
        thumbnail_status: product.thumbnail_status
      });
    }

    // Generate thumbnail asynchronously
    thumbnailService.generateThumbnail(product_id, image_url)
      .then(result => {
        console.log(`✅ Thumbnail generated for product ${product_id}`);
      })
      .catch(error => {
        console.error(`❌ Thumbnail generation failed for product ${product_id}:`, error);
      });

    return res.status(202).json({
      success: true,
      message: 'Thumbnail generation started',
      status: 'PROCESSING',
      product_id
    });

  } catch (error) {
    console.error('❌ Error in internal product thumbnail route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Mount internal routes at /api/internal
app.use("/api/internal", internalRouter);
console.log('✅ Internal routes registered at /api/internal');

// ============================================================
// PUBLIC ROUTES
// ============================================================
app.use("/api/vendor", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", require("./routes/vendorOrders"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/seller", sellerDocumentRoutes);

// Public test endpoint
app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Vendor Backend API is working!",
    port: process.env.PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
  console.log(`🔐 Internal API Key: ${process.env.INTERNAL_API_KEY ? 'Set' : 'NOT SET'}`);
  console.log(`🤖 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'NOT SET'}`);
  console.log(`📍 Internal API: http://localhost:${process.env.PORT}/api/internal`);
  console.log(`📍 Test endpoint: http://localhost:${process.env.PORT}/api/internal/test`);
});