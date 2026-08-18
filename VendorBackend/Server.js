require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const reviewRoutes = require("./routes/reviewRoutes");
const sellerDocumentRoutes = require("./routes/sellerDocument.routes");
const notificationRoutes =require("./routes/notificationRoutes");

const settingsRoutes =require("./routes/settingsRoutes");
const app = express();

app.use(cors({
  origin: [
    'http://localhost:3002',
    "https://vendor.native91.com",
    "https://native91.com",
    "https://admin.native91.com",
    "http://localhost:3000",
    "http://localhost:3001",
"https://api-vendor.native91.com"
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

app.use("/api/vendor", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", require("./routes/vendorOrders"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/seller", sellerDocumentRoutes);
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
});










