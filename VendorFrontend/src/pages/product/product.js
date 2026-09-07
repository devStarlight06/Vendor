// Product.js - COMPLETE UPDATED FILE WITH SHIPPING TIME FIELDS

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Table,
  Button,
  Modal,
  Form,
  Spinner,
  Alert,
  Badge,
  Row,
  Col,
  Card,
  Image
} from "react-bootstrap";
import { motion } from "framer-motion";
import { 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaFileExcel, 
  FaSync, 
  FaBan, 
  FaExclamationTriangle,
  FaBoxes,
  FaWarehouse,
  FaExclamationCircle,
  FaCheckCircle,
  FaMinusCircle,
  FaPlusCircle,
  FaWeight,
  FaRulerCombined,
  FaImage,
  FaUpload,
  FaTimes,
  FaDownload,
  FaArrowLeft,
  FaArrowRight,
  FaTruck,
  FaRupeeSign
} from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = "https://api-vendor.native91.com/api/products";
const ADMIN_CATEGORY_API_URL = "https://api-admin.native91.com/api/category";
const AUTH_API_URL = "https://api-vendor.native91.com/api/vendor";
const BASE_URL = "https://api-vendor.native91.com";

// const API_URL = "http://localhost:5177/api/products";
// const ADMIN_CATEGORY_API_URL = "http://localhost:7001/api/category";
// const AUTH_API_URL = "http://localhost:5177/api/vendor";
// const BASE_URL = "http://localhost:5177";

const Product = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const [editData, setEditData] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    stock: 0,
    images: [],
    size: "",
    weight: 0,
    weightUnit: "",
    sku: "",
    variant: "",
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm"
    },
    // 🚚 Shipping fields
    shippingTime: "3-5 days",
    customShippingTime: "",
    estimatedDeliveryDays: {
      min: 3,
      max: 5
    },
    shippingCharge: 0,
    isFreeShipping: true
  });

  const [shippingOptions, setShippingOptions] = useState([]);

  const [stockUpdateData, setStockUpdateData] = useState({
    productId: "",
    productName: "",
    currentStock: 0,
    newStock: 0,
    operation: "set",
    quantity: 0,
  });

  const [excelFile, setExcelFile] = useState(null);
  const [bulkImages, setBulkImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // ================= ENHANCED BULK UPLOAD STATES =================
  const [uploadStep, setUploadStep] = useState(1);
  const [validationData, setValidationData] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showValidationPreview, setShowValidationPreview] = useState(false);

  // Image Uploader States (kept for internal use)
  const [imageList, setImageList] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  const token = localStorage.getItem("token");

  // ================= SUSPENSION STATE =================
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  // ================= FETCH SHIPPING OPTIONS =================
  const fetchShippingOptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/shipping-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShippingOptions(res.data.shippingOptions);
      }
    } catch (err) {
      console.error("Error fetching shipping options:", err);
      // Fallback options
      setShippingOptions([
        { value: '1-2 days', label: '1-2 days' },
        { value: '2-3 days', label: '2-3 days' },
        { value: '3-4 days', label: '3-4 days' },
        { value: '3-5 days', label: '3-5 days' },
        { value: '5-7 days', label: '5-7 days' },
        { value: '7-10 days', label: '7-10 days' },
        { value: '10-15 days', label: '10-15 days' },
        { value: '15-30 days', label: '15-30 days' },
        { value: 'Custom', label: 'Custom (specify custom shipping time)' }
      ]);
    }
  };

  // ================= CHECK VENDOR STATUS =================
  const checkVendorStatus = async () => {
    try {
      const res = await axios.get(`${AUTH_API_URL}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = res.data;
      if (data && data.isSuspended) {
        setSuspensionInfo({
          isSuspended: true,
          reason: data.suspensionReason || 'No reason provided',
          suspendedAt: data.suspendedAt
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Status check error:", err.message);
      try {
        const storedVendor = JSON.parse(localStorage.getItem('vendorData') || '{}');
        if (storedVendor.status === 'suspended') {
          setSuspensionInfo({
            isSuspended: true,
            reason: storedVendor.suspensionReason || 'No reason provided',
            suspendedAt: storedVendor.suspendedAt
          });
          return true;
        }
      } catch (localErr) {
        console.warn("LocalStorage status check error:", localErr.message);
      }
      return false;
    }
  };

  // ================= FETCH CATEGORIES =================
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setError("");
      
      const res = await axios.get(`${ADMIN_CATEGORY_API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let categoriesData = [];
      if (res.data.success && Array.isArray(res.data.categories)) {
        categoriesData = res.data.categories;
      } else if (Array.isArray(res.data)) {
        categoriesData = res.data;
      } else if (res.data.categories && Array.isArray(res.data.categories)) {
        categoriesData = res.data.categories;
      }
      
      const activeCategories = categoriesData.filter(cat => cat.status === "active");
      setCategories(activeCategories);
      
      if (activeCategories.length === 0) {
        setError("No active categories found. Please contact admin.");
      }
      
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please try again.");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // ================= FETCH PRODUCTS =================
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productList = res.data.products || res.data || [];
      setProducts(productList);
      calculateStockSummary(productList);
    } catch (err) {
      console.error("Error fetching products:", err);
      if (err.response?.status === 403) {
        setError("Access denied. Please check your account status.");
      } else {
        setError("Failed to fetch products");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= CALCULATE STOCK SUMMARY =================
  const calculateStockSummary = (productList) => {
    const summary = {
      totalProducts: productList.length,
      totalStock: 0,
      lowStock: 0,
      outOfStock: 0,
    };

    productList.forEach(product => {
      const stock = product.stock || 0;
      summary.totalStock += stock;
      
      if (stock === 0) {
        summary.outOfStock++;
      } else if (stock <= 10) {
        summary.lowStock++;
      }
    });

    setStockSummary(summary);
  };

  // ================= SYNC CATEGORIES =================
  const syncCategories = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot sync categories while account is suspended.");
      return;
    }
    setSyncing(true);
    await fetchCategories();
    setSyncing(false);
    setSuccess("Categories synced successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    const initialize = async () => {
      const isSuspended = await checkVendorStatus();
      if (!isSuspended) {
        await Promise.all([fetchProducts(), fetchCategories(), fetchShippingOptions()]);
      } else {
        setLoading(false);
        setCategoriesLoading(false);
      }
    };
    initialize();
  }, []);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= ADD PRODUCT =================
  const handleAddProduct = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot add products while account is suspended.");
      return;
    }
    
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      setError("Please fill all required fields (Name, Price, Category)");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("name", newProduct.name);
      formData.append("price", newProduct.price);
      formData.append("category", newProduct.category);
      formData.append("description", newProduct.description || "");
      formData.append("stock", newProduct.stock || 0);
      
      formData.append("size", newProduct.size || "");
      formData.append("weight", newProduct.weight || 0);
      formData.append("weightUnit", newProduct.weightUnit || "");
      formData.append("sku", newProduct.sku || "");
      formData.append("variant", newProduct.variant || "");
      formData.append("dimensions[length]", newProduct.dimensions?.length || 0);
      formData.append("dimensions[width]", newProduct.dimensions?.width || 0);
      formData.append("dimensions[height]", newProduct.dimensions?.height || 0);
      formData.append("dimensions[unit]", newProduct.dimensions?.unit || "cm");

      // 🚚 Append shipping fields
      formData.append("shippingTime", newProduct.shippingTime || "3-5 days");
      formData.append("customShippingTime", newProduct.customShippingTime || "");
      formData.append("estimatedDeliveryDays[min]", newProduct.estimatedDeliveryDays?.min || 3);
      formData.append("estimatedDeliveryDays[max]", newProduct.estimatedDeliveryDays?.max || 5);
      formData.append("shippingCharge", newProduct.shippingCharge || 0);
      formData.append("isFreeShipping", newProduct.isFreeShipping ? "true" : "false");

      if (newProduct.images && newProduct.images.length > 0) {
        newProduct.images.forEach((file) => {
          formData.append("images", file);
        });
      }

      await axios.post(API_URL, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setShowAdd(false);
      setNewProduct({
        name: "",
        price: "",
        category: "",
        description: "",
        stock: 0,
        images: [],
        size: "",
        weight: 0,
        weightUnit: "",
        sku: "",
        variant: "",
        dimensions: {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm"
        },
        shippingTime: "3-5 days",
        customShippingTime: "",
        estimatedDeliveryDays: {
          min: 3,
          max: 5
        },
        shippingCharge: 0,
        isFreeShipping: true
      });

      fetchProducts();
      setSuccess("Product added successfully!");
    } catch (err) {
      console.error("Add product error:", err);
      setError(err.response?.data?.message || "Add product failed");
    }
  };

  // ================= EDIT PRODUCT =================
  const handleEdit = (product) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot edit products while account is suspended.");
      return;
    }
    setEditData({ 
      ...product,
      dimensions: product.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },
      estimatedDeliveryDays: product.estimatedDeliveryDays || { min: 3, max: 5 },
      shippingTime: product.shippingTime || "3-5 days",
      customShippingTime: product.customShippingTime || "",
      shippingCharge: product.shippingCharge || 0,
      isFreeShipping: product.isFreeShipping !== undefined ? product.isFreeShipping : true
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot update products while account is suspended.");
      return;
    }
    
    try {
      const formData = new FormData();

      formData.append("name", editData.name);
      formData.append("price", editData.price);
      formData.append("category", editData.category);
      formData.append("description", editData.description || "");
      formData.append("stock", editData.stock || 0);
      
      formData.append("size", editData.size || "");
      formData.append("weight", editData.weight || 0);
      formData.append("weightUnit", editData.weightUnit || "");
      formData.append("sku", editData.sku || "");
      formData.append("variant", editData.variant || "");
      formData.append("dimensions[length]", editData.dimensions?.length || 0);
      formData.append("dimensions[width]", editData.dimensions?.width || 0);
      formData.append("dimensions[height]", editData.dimensions?.height || 0);
      formData.append("dimensions[unit]", editData.dimensions?.unit || "cm");

      // 🚚 Append shipping fields
      formData.append("shippingTime", editData.shippingTime || "3-5 days");
      formData.append("customShippingTime", editData.customShippingTime || "");
      formData.append("estimatedDeliveryDays[min]", editData.estimatedDeliveryDays?.min || 3);
      formData.append("estimatedDeliveryDays[max]", editData.estimatedDeliveryDays?.max || 5);
      formData.append("shippingCharge", editData.shippingCharge || 0);
      formData.append("isFreeShipping", editData.isFreeShipping ? "true" : "false");

      if (editData.newImages && editData.newImages.length > 0) {
        editData.newImages.forEach((file) => {
          formData.append("images", file);
        });
      }

      await axios.put(`${API_URL}/${editData._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setShowEdit(false);
      fetchProducts();
      setSuccess("Product updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      setError("Update failed");
    }
  };

  // ================= STOCK MANAGEMENT =================
  const openStockModal = (product) => {
    setStockUpdateData({
      productId: product._id,
      productName: product.name,
      currentStock: product.stock || 0,
      newStock: product.stock || 0,
      operation: "set",
      quantity: 0,
    });
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot update stock while account is suspended.");
      return;
    }

    try {
      let finalStock = stockUpdateData.newStock;
      
      if (stockUpdateData.operation === "add") {
        finalStock = stockUpdateData.currentStock + stockUpdateData.quantity;
      } else if (stockUpdateData.operation === "subtract") {
        if (stockUpdateData.currentStock < stockUpdateData.quantity) {
          setError("Insufficient stock! Cannot subtract more than available.");
          return;
        }
        finalStock = stockUpdateData.currentStock - stockUpdateData.quantity;
      }

      if (finalStock < 0) {
        setError("Stock cannot be negative!");
        return;
      }

      const stockUrl = `${API_URL}/product/${stockUpdateData.productId}/stock`;

      const response = await axios.patch(
        stockUrl,
        { stock: finalStock },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowStockModal(false);
      fetchProducts();
      setSuccess(`Stock updated successfully! New stock: ${finalStock}`);
      
    } catch (err) {
      console.error("❌ Stock update error:", err);
      setError(err.response?.data?.message || "Failed to update stock");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot delete products while account is suspended.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(products.filter((p) => p._id !== id));
      setSuccess("Product deleted successfully!");
      calculateStockSummary(products.filter((p) => p._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  // ================= DOWNLOAD EXCEL TEMPLATE =================
  const downloadTemplate = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot download template while account is suspended.");
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/download-template`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "product_bulk_upload_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess("Template downloaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Download template error:", err);
      setError("Failed to download template");
    }
  };

  // ================= ENHANCED BULK UPLOAD FUNCTIONS =================

  // Validate Excel file before upload
  const handleValidateExcel = async () => {
    if (!excelFile) {
      setError("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("excelFile", excelFile);

    setUploadProgress(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/bulk-upload/validate`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setValidationData(response.data.data);
        setUploadStep(2);
        setShowValidationPreview(true);
        setSuccess(`✅ File validated! ${response.data.data.summary.valid} valid rows found.`);
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError(err.response?.data?.message || "Validation failed");
    } finally {
      setUploadProgress(false);
    }
  };

  // Process the bulk upload
  const handleProcessBulkUpload = async () => {
    if (!excelFile) {
      setError("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("excelFile", excelFile);
    
    if (bulkImages && bulkImages.length > 0) {
      bulkImages.forEach((file) => {
        formData.append("images", file);
      });
    }

    setUploadProgress(true);
    setUploadResult(null);
    setProcessingProgress(0);

    try {
      const response = await axios.post(
        `${API_URL}/bulk-upload/process`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProcessingProgress(percentCompleted);
          },
        }
      );

      setUploadResult(response.data);
      
      if (response.data.summary.successful > 0) {
        setSuccess(`✅ ${response.data.message}`);
        fetchProducts();
        setTimeout(() => {
          setShowBulkUpload(false);
          resetBulkUpload();
        }, 2000);
      } else {
        setError("No products were uploaded. Please check the file format.");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setError(err.response?.data?.message || "Bulk upload failed");
    } finally {
      setUploadProgress(false);
      setProcessingProgress(100);
    }
  };

  // Reset bulk upload state
  const resetBulkUpload = () => {
    setUploadStep(1);
    setValidationData(null);
    setExcelFile(null);
    setBulkImages([]);
    setUploadResult(null);
    setProcessingProgress(0);
    setShowValidationPreview(false);
  };

  // ================= GET IMAGE URL =================
  const getImageUrl = (product) => {
    if (!product) return null;
    
    let imagePath = null;
    
    if (product.image) {
      if (Array.isArray(product.image) && product.image.length > 0) {
        imagePath = product.image[0];
      } else if (typeof product.image === 'string' && product.image) {
        imagePath = product.image;
      }
    }
    
    if (!imagePath) {
      return null;
    }
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
      return `${BASE_URL}${imagePath}`;
    }
    
    if (!imagePath.startsWith('/') && !imagePath.startsWith('http')) {
      return `${BASE_URL}/uploads/${imagePath}`;
    }
    
    return `${BASE_URL}${imagePath}`;
  };

  // 🚚 Get shipping display text
  const getShippingDisplay = (product) => {
    if (!product) return "—";
    
    let shippingText = product.shippingTime || "3-5 days";
    
    if (shippingText === "Custom" && product.customShippingTime) {
      shippingText = product.customShippingTime;
    }
    
    const charge = product.shippingCharge || 0;
    const isFree = product.isFreeShipping !== undefined ? product.isFreeShipping : true;
    
    let chargeText = isFree ? "Free" : `₹${charge}`;
    
    return `${chargeText} • ${shippingText}`;
  };

  // ================= RENDER =================
  if (loading || categoriesLoading) {
    return (
      <>
        <Header />
        <Sidebar />
        <main className="admin-content mt-5">
          <Container fluid>
            <div className="text-center py-5">
              <Spinner animation="border" /> Loading products...
            </div>
          </Container>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <Sidebar />

      <main className="admin-content mt-5">
        <Container fluid>
          {/* Messages */}
          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

          {/* 🚫 SUSPENSION ALERT */}
          {suspensionInfo.isSuspended && (
            <Alert variant="danger" className="mb-4">
              <div className="d-flex align-items-start">
                <FaBan className="me-3 mt-1" style={{ fontSize: '28px' }} />
                <div>
                  <h5 className="mb-1">
                    <FaExclamationTriangle className="me-2" />
                    Account Suspended
                  </h5>
                  <p className="mb-1">
                    <strong>Reason:</strong> {suspensionInfo.reason || 'No reason provided'}
                  </p>
                  {suspensionInfo.suspendedAt && (
                    <small className="text-muted d-block">
                      Suspended on: {new Date(suspensionInfo.suspendedAt).toLocaleString()}
                    </small>
                  )}
                  <p className="mt-2 mb-0">
                    <small>Product management is disabled while your account is suspended.</small>
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* 📊 STOCK SUMMARY CARDS */}
          {!suspensionInfo.isSuspended && (
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center bg-primary text-white">
                  <Card.Body>
                    <FaBoxes size={30} />
                    <h5 className="mt-2">{stockSummary.totalProducts}</h5>
                    <small>Total Products</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center bg-success text-white">
                  <Card.Body>
                    <FaWarehouse size={30} />
                    <h5 className="mt-2">{stockSummary.totalStock}</h5>
                    <small>Total Stock</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center bg-warning text-dark">
                  <Card.Body>
                    <FaExclamationCircle size={30} />
                    <h5 className="mt-2">{stockSummary.lowStock}</h5>
                    <small>Low Stock (≤ 10)</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center bg-danger text-white">
                  <Card.Body>
                    <FaMinusCircle size={30} />
                    <h5 className="mt-2">{stockSummary.outOfStock}</h5>
                    <small>Out of Stock</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              My Products 
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
              <Badge bg="secondary" className="ms-2">
                {products.length} products
              </Badge>
            </motion.h4>

            <div>
              {!suspensionInfo.isSuspended ? (
                <>
                  <Button 
                    variant="success" 
                    className="me-2"
                    onClick={() => setShowBulkUpload(true)}
                  >
                    <FaFileExcel /> Bulk Upload
                  </Button>
                  <Button onClick={() => setShowAdd(true)}>
                    <FaPlus /> Add Product
                  </Button>
                </>
              ) : (
                <Button variant="secondary" disabled>
                  <FaBan className="me-1" /> Product Management Disabled
                </Button>
              )}
            </div>
          </div>

          {/* Category Info Alert */}
          {categories.length === 0 && !suspensionInfo.isSuspended && (
            <Alert variant="warning">
              <Alert.Heading>No Categories Available!</Alert.Heading>
              <p>
                No active categories found. Please contact the admin to add categories.
              </p>
            </Alert>
          )}

          {/* TABLE WITH SHIPPING COLUMN */}
          <Table responsive bordered hover className={suspensionInfo.isSuspended ? 'opacity-50' : ''}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Size/Weight</th>
                <th>Stock</th>
                <th>Shipping</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    {suspensionInfo.isSuspended ? 'Products are hidden while account is suspended' : 'No products found'}
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const stock = item.stock || 0;
                  let stockBadgeColor = "success";
                  let stockLabel = `${stock} in stock`;
                  
                  if (stock === 0) {
                    stockBadgeColor = "danger";
                    stockLabel = "Out of Stock";
                  } else if (stock <= 10) {
                    stockBadgeColor = "warning";
                    stockLabel = `Low Stock (${stock})`;
                  }

                  let sizeWeightDisplay = "—";
                  if (item.size) {
                    sizeWeightDisplay = item.size;
                  } else if (item.weight && item.weightUnit) {
                    sizeWeightDisplay = `${item.weight} ${item.weightUnit}`;
                  } else if (item.weight) {
                    sizeWeightDisplay = `${item.weight}`;
                  }

                  const imageUrl = getImageUrl(item);
                  
                  return (
                    <tr key={item._id} className={suspensionInfo.isSuspended ? 'table-secondary' : ''}>
                      <td>
                        {imageUrl ? (
                          <Image 
                            src={imageUrl} 
                            alt={item.name}
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              objectFit: 'cover',
                              borderRadius: '4px'
                            }}
                            onError={(e) => {
                              e.target.src = '';
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              const fallback = parent.querySelector('.fallback-icon');
                              if (fallback) fallback.style.display = 'inline-block';
                            }}
                          />
                        ) : null}
                        {!imageUrl && (
                          <div 
                            className="fallback-icon d-flex align-items-center justify-content-center"
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              backgroundColor: '#f0f0f0',
                              borderRadius: '4px',
                              color: '#999'
                            }}
                          >
                            <FaImage size={20} />
                          </div>
                        )}
                      </td>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>₹{item.price}</td>
                      <td>
                        <small>{sizeWeightDisplay}</small>
                        {item.sku && (
                          <div className="text-muted small">SKU: {item.sku}</div>
                        )}
                      </td>
                      <td>
                        <Badge bg={stockBadgeColor}>
                          {stockLabel}
                        </Badge>
                      </td>
                      <td>
                        <div className="small">
                          <FaTruck className="me-1 text-muted" />
                          {getShippingDisplay(item)}
                        </div>
                      </td>
                      <td>
                        <Badge bg={item.isActive !== false ? 'success' : 'secondary'}>
                          {item.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        {!suspensionInfo.isSuspended ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline-info"
                              className="me-1"
                              onClick={() => openStockModal(item)}
                              title="Manage Stock"
                            >
                              <FaBoxes />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-1"
                              onClick={() => handleEdit(item)}
                              title="Edit Product"
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(item._id)}
                              title="Delete Product"
                            >
                              <FaTrash />
                            </Button>
                          </>
                        ) : (
                          <Badge bg="secondary">Locked</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>

          {/* Footer Info */}
          {!suspensionInfo.isSuspended && (
            <div className="text-muted small">
              Total Products: {products.length}
              {categories.length > 0 && ` | Available Categories: ${categories.length}`}
              {stockSummary.lowStock > 0 && ` | ⚠️ ${stockSummary.lowStock} products low on stock`}
              {stockSummary.outOfStock > 0 && ` | 🚫 ${stockSummary.outOfStock} products out of stock`}
            </div>
          )}
        </Container>
      </main>

      {/* ================= ADD MODAL ================= */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Product</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Product Name *</Form.Label>
                  <Form.Control
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter price"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Initial Stock</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter initial stock quantity"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold">
              <FaWeight className="me-2" />
              Size & Weight Details
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Size</Form.Label>
                  <Form.Control
                    placeholder="e.g., M, L, XL"
                    value={newProduct.size}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, size: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Weight</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="e.g., 250"
                    value={newProduct.weight}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, weight: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Weight Unit</Form.Label>
                  <Form.Select
                    value={newProduct.weightUnit}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, weightUnit: e.target.value })
                    }
                  >
                    <option value="">Select Unit</option>
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="L">Liter (L)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>SKU</Form.Label>
                  <Form.Control
                    placeholder="e.g., PRD-001"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Variant</Form.Label>
                  <Form.Control
                    placeholder="e.g., Red, Blue"
                    value={newProduct.variant}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, variant: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold">
              <FaRulerCombined className="me-2" />
              Dimensions
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Length</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0"
                    value={newProduct.dimensions?.length || 0}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        dimensions: {
                          ...newProduct.dimensions,
                          length: parseFloat(e.target.value) || 0
                        }
                      })
                    }
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Width</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0"
                    value={newProduct.dimensions?.width || 0}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        dimensions: {
                          ...newProduct.dimensions,
                          width: parseFloat(e.target.value) || 0
                        }
                      })
                    }
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Height</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0"
                    value={newProduct.dimensions?.height || 0}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        dimensions: {
                          ...newProduct.dimensions,
                          height: parseFloat(e.target.value) || 0
                        }
                      })
                    }
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Unit</Form.Label>
                  <Form.Select
                    value={newProduct.dimensions?.unit || "cm"}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        dimensions: {
                          ...newProduct.dimensions,
                          unit: e.target.value
                        }
                      })
                    }
                  >
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* 🚚 SHIPPING SECTION */}
            <Form.Label className="fw-bold mt-2">
              <FaTruck className="me-2" />
              Shipping Information
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Shipping Time *</Form.Label>
                  <Form.Select
                    value={newProduct.shippingTime || "3-5 days"}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, shippingTime: e.target.value })
                    }
                  >
                    {shippingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Custom Shipping Time</Form.Label>
                  <Form.Control
                    placeholder="e.g., Ships within 1 week"
                    value={newProduct.customShippingTime || ""}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, customShippingTime: e.target.value })
                    }
                    disabled={newProduct.shippingTime !== "Custom"}
                  />
                  <small className="text-muted">
                    {newProduct.shippingTime === "Custom" 
                      ? "Enter your custom shipping description" 
                      : "Only used when 'Custom' is selected above"}
                  </small>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Delivery Days</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={newProduct.estimatedDeliveryDays?.min || 3}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        estimatedDeliveryDays: {
                          ...newProduct.estimatedDeliveryDays,
                          min: parseInt(e.target.value) || 1
                        }
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Delivery Days</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={newProduct.estimatedDeliveryDays?.max || 5}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        estimatedDeliveryDays: {
                          ...newProduct.estimatedDeliveryDays,
                          max: parseInt(e.target.value) || 1
                        }
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Shipping Charge (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.5"
                    value={newProduct.shippingCharge || 0}
                    onChange={(e) =>
                      setNewProduct({ 
                        ...newProduct, 
                        shippingCharge: parseFloat(e.target.value) || 0 
                      })
                    }
                  />
                  <small className="text-muted">0 = Free Shipping</small>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Free Shipping"
                checked={newProduct.isFreeShipping !== undefined ? newProduct.isFreeShipping : true}
                onChange={(e) =>
                  setNewProduct({ 
                    ...newProduct, 
                    isFreeShipping: e.target.checked 
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter product description"
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Product Images</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setNewProduct({
                    ...newProduct,
                    images: files,
                  });
                }}
              />
              <small className="text-muted">You can select multiple images</small>
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddProduct}>
            Add Product
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= EDIT MODAL ================= */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Product</Modal.Title>
        </Modal.Header>

        {editData && (
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Product Name</Form.Label>
                    <Form.Control
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={editData.category}
                      onChange={(e) =>
                        setEditData({ ...editData, category: e.target.value })
                      }
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Price (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      value={editData.price}
                      onChange={(e) =>
                        setEditData({ ...editData, price: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Stock</Form.Label>
                    <Form.Control
                      type="number"
                      value={editData.stock || 0}
                      onChange={(e) =>
                        setEditData({ ...editData, stock: parseInt(e.target.value) || 0 })
                      }
                      min="0"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Label className="fw-bold">
                <FaWeight className="me-2" />
                Size & Weight Details
              </Form.Label>
              <hr className="mt-1 mb-3" />

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Size</Form.Label>
                    <Form.Control
                      placeholder="e.g., M, L, XL"
                      value={editData.size || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, size: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Weight</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="e.g., 250"
                      value={editData.weight || 0}
                      onChange={(e) =>
                        setEditData({ ...editData, weight: parseFloat(e.target.value) || 0 })
                      }
                      min="0"
                      step="0.1"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Weight Unit</Form.Label>
                    <Form.Select
                      value={editData.weightUnit || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, weightUnit: e.target.value })
                      }
                    >
                      <option value="">Select Unit</option>
                      <option value="g">Gram (g)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="L">Liter (L)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>SKU</Form.Label>
                    <Form.Control
                      placeholder="e.g., PRD-001"
                      value={editData.sku || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, sku: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Variant</Form.Label>
                    <Form.Control
                      placeholder="e.g., Red, Blue"
                      value={editData.variant || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, variant: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Label className="fw-bold">
                <FaRulerCombined className="me-2" />
                Dimensions
              </Form.Label>
              <hr className="mt-1 mb-3" />

              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Length</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0"
                      value={editData.dimensions?.length || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          dimensions: {
                            ...editData.dimensions,
                            length: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      min="0"
                      step="0.1"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Width</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0"
                      value={editData.dimensions?.width || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          dimensions: {
                            ...editData.dimensions,
                            width: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      min="0"
                      step="0.1"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Height</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0"
                      value={editData.dimensions?.height || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          dimensions: {
                            ...editData.dimensions,
                            height: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      min="0"
                      step="0.1"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Unit</Form.Label>
                    <Form.Select
                      value={editData.dimensions?.unit || "cm"}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          dimensions: {
                            ...editData.dimensions,
                            unit: e.target.value
                          }
                        })
                      }
                    >
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* 🚚 SHIPPING SECTION - EDIT */}
              <Form.Label className="fw-bold mt-2">
                <FaTruck className="me-2" />
                Shipping Information
              </Form.Label>
              <hr className="mt-1 mb-3" />

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Shipping Time *</Form.Label>
                    <Form.Select
                      value={editData.shippingTime || "3-5 days"}
                      onChange={(e) =>
                        setEditData({ ...editData, shippingTime: e.target.value })
                      }
                    >
                      {shippingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Custom Shipping Time</Form.Label>
                    <Form.Control
                      placeholder="e.g., Ships within 1 week"
                      value={editData.customShippingTime || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, customShippingTime: e.target.value })
                      }
                      disabled={editData.shippingTime !== "Custom"}
                    />
                    <small className="text-muted">
                      {editData.shippingTime === "Custom" 
                        ? "Enter your custom shipping description" 
                        : "Only used when 'Custom' is selected above"}
                    </small>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Min Delivery Days</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editData.estimatedDeliveryDays?.min || 3}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          estimatedDeliveryDays: {
                            ...editData.estimatedDeliveryDays,
                            min: parseInt(e.target.value) || 1
                          }
                        })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Delivery Days</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={editData.estimatedDeliveryDays?.max || 5}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          estimatedDeliveryDays: {
                            ...editData.estimatedDeliveryDays,
                            max: parseInt(e.target.value) || 1
                          }
                        })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Shipping Charge (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.5"
                      value={editData.shippingCharge || 0}
                      onChange={(e) =>
                        setEditData({ 
                          ...editData, 
                          shippingCharge: parseFloat(e.target.value) || 0 
                        })
                      }
                    />
                    <small className="text-muted">0 = Free Shipping</small>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Free Shipping"
                  checked={editData.isFreeShipping !== undefined ? editData.isFreeShipping : true}
                  onChange={(e) =>
                    setEditData({ 
                      ...editData, 
                      isFreeShipping: e.target.checked 
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editData.description || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Change Images</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      newImages: Array.from(e.target.files),
                    })
                  }
                />
                <small className="text-muted">
                  Upload new images to replace existing ones
                </small>
              </Form.Group>
            </Form>
          </Modal.Body>
        )}

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= STOCK MANAGEMENT MODAL ================= */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBoxes className="me-2" />
            Manage Stock: {stockUpdateData.productName}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Alert variant="info">
              <strong>Current Stock:</strong> {stockUpdateData.currentStock} units
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Operation</Form.Label>
              <Form.Select
                value={stockUpdateData.operation}
                onChange={(e) => {
                  const operation = e.target.value;
                  setStockUpdateData({
                    ...stockUpdateData,
                    operation,
                    quantity: 0,
                    newStock: operation === "set" ? stockUpdateData.currentStock : 0,
                  });
                }}
              >
                <option value="set">Set Exact Stock</option>
                <option value="add">Add to Stock (+)</option>
                <option value="subtract">Subtract from Stock (-)</option>
              </Form.Select>
            </Form.Group>

            {stockUpdateData.operation === "set" && (
              <Form.Group className="mb-3">
                <Form.Label>New Stock Quantity</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={stockUpdateData.newStock}
                  onChange={(e) =>
                    setStockUpdateData({
                      ...stockUpdateData,
                      newStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Form.Group>
            )}

            {(stockUpdateData.operation === "add" || stockUpdateData.operation === "subtract") && (
              <Form.Group className="mb-3">
                <Form.Label>
                  {stockUpdateData.operation === "add" ? "Quantity to Add" : "Quantity to Subtract"}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={stockUpdateData.quantity}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 0;
                    let newStock = stockUpdateData.currentStock;
                    
                    if (stockUpdateData.operation === "add") {
                      newStock = stockUpdateData.currentStock + quantity;
                    } else if (stockUpdateData.operation === "subtract") {
                      newStock = Math.max(0, stockUpdateData.currentStock - quantity);
                    }
                    
                    setStockUpdateData({
                      ...stockUpdateData,
                      quantity,
                      newStock,
                    });
                  }}
                />
              </Form.Group>
            )}

            <Alert variant="warning">
              <FaExclamationCircle className="me-2" />
              <strong>New Stock After Update:</strong> {stockUpdateData.newStock} units
            </Alert>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStockModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStockUpdate}
            disabled={stockUpdateData.newStock < 0}
          >
            <FaCheckCircle className="me-1" />
            Update Stock
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= ENHANCED BULK UPLOAD MODAL (AMAZON STYLE) ================= */}
      <Modal 
        show={showBulkUpload} 
        onHide={() => {
          setShowBulkUpload(false);
          resetBulkUpload();
        }} 
        centered 
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileExcel className="me-2" />
            Bulk Upload Products
            <Badge bg="info" className="ms-2">Amazon-Style</Badge>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Step 1: Upload File */}
          {uploadStep === 1 && (
            <>
              <div className="mb-4 p-3 bg-light rounded">
                <h6>📋 How to Bulk Upload</h6>
                <ol className="small mb-0">
                  <li>Download the Excel template below</li>
                  <li>Fill in your product details (Name, Price, Category are required)</li>
                  <li>Upload the filled Excel file</li>
                  <li>Review the validation preview</li>
                  <li>Confirm and process the upload</li>
                </ol>
              </div>

              <div className="mb-3">
                <Button variant="info" onClick={downloadTemplate} className="mb-3">
                  <FaDownload className="me-2" />
                  Download Excel Template
                </Button>
                <p className="text-muted small">
                  <strong>📸 Image Options:</strong>
                  <br />
                  • Add image filenames in the Images column (e.g., product1.jpg, product2.jpg)
                  <br />
                  • Upload the actual image files below (they'll be auto-assigned)
                  <br />
                  <strong>🚚 Shipping Columns:</strong>
                  <br />
                  • Shipping Time, Custom Shipping Time, Min/Max Delivery Days
                  <br />
                  • Shipping Charge, Free Shipping (yes/no)
                </p>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>📊 Select Excel File (.xlsx, .xls) *</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  disabled={uploadProgress}
                  required
                />
                {excelFile && (
                  <small className="text-success">
                    ✅ Selected: {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                  </small>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>🖼️ Upload Product Images (Optional)</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setBulkImages(files);
                  }}
                  disabled={uploadProgress}
                />
                {bulkImages.length > 0 && (
                  <small className="text-success">
                    ✅ {bulkImages.length} image(s) selected
                  </small>
                )}
                <div className="mt-2">
                  <small className="text-muted">
                    • Images will be automatically assigned to products in order
                    <br />
                    • If you specify filenames in Excel, they'll be matched with uploaded files
                    <br />
                    • Supported formats: JPG, PNG, GIF, WebP (Max 5MB each)
                  </small>
                </div>
              </Form.Group>

              {bulkImages.length > 0 && (
                <div className="mt-3">
                  <h6>Selected Images Preview:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {bulkImages.slice(0, 6).map((file, index) => (
                      <div key={index} className="border rounded p-1" style={{ width: '80px' }}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                        />
                        <small className="text-muted d-block text-truncate" style={{ fontSize: '10px' }}>
                          {file.name}
                        </small>
                      </div>
                    ))}
                    {bulkImages.length > 6 && (
                      <div className="d-flex align-items-center justify-content-center border rounded" style={{ width: '80px', height: '80px' }}>
                        <small>+{bulkImages.length - 6} more</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Preview & Validation */}
          {uploadStep === 2 && validationData && (
            <>
              <div className="mb-4">
                <h6>📊 Validation Summary</h6>
                <Row className="g-2">
                  <Col xs={6} md={3}>
                    <Card className="bg-primary text-white text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.total}</h6>
                        <small>Total Rows</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="bg-success text-white text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.valid}</h6>
                        <small>Valid</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="bg-danger text-white text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.invalid}</h6>
                        <small>Invalid</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="bg-warning text-dark text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.warning}</h6>
                        <small>Warnings</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* Preview of valid rows */}
              {validationData.preview && validationData.preview.length > 0 && (
                <div className="mb-3">
                  <h6>📋 Preview (First 5 Valid Products)</h6>
                  <Table bordered size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Shipping</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationData.preview.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{item.name}</td>
                          <td>₹{item.price}</td>
                          <td>{item.category}</td>
                          <td>{item.stock}</td>
                          <td>{item.shippingTime || "3-5 days"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Errors */}
              {validationData.errors && validationData.errors.length > 0 && (
                <Alert variant="danger" className="mt-2">
                  <Alert.Heading>❌ Validation Errors</Alert.Heading>
                  <ul className="mb-0 small">
                    {validationData.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {validationData.errors.length > 10 && (
                      <li>...and {validationData.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </Alert>
              )}

              {/* Warnings */}
              {validationData.warnings && validationData.warnings.length > 0 && (
                <Alert variant="warning" className="mt-2">
                  <Alert.Heading>⚠️ Warnings</Alert.Heading>
                  <ul className="mb-0 small">
                    {validationData.warnings.slice(0, 5).map((warn, idx) => (
                      <li key={idx}>
                        Row {warn.rowNumber}: {warn.warnings.join(', ')}
                      </li>
                    ))}
                    {validationData.warnings.length > 5 && (
                      <li>...and {validationData.warnings.length - 5} more warnings</li>
                    )}
                  </ul>
                </Alert>
              )}

              {validationData.summary.invalid > 0 && (
                <Alert variant="danger">
                  <strong>⚠️ {validationData.summary.invalid} rows have errors.</strong> These rows will be skipped during upload.
                </Alert>
              )}

              {validationData.summary.valid === 0 && (
                <Alert variant="danger">
                  <strong>❌ No valid rows found.</strong> Please fix the errors and try again.
                </Alert>
              )}
            </>
          )}

          {/* Processing Progress */}
          {uploadProgress && (
            <div className="mt-3">
              <div className="d-flex justify-content-between mb-1">
                <span>Processing...</span>
                <span>{processingProgress}%</span>
              </div>
              <div className="progress" style={{ height: '20px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{ width: `${processingProgress}%` }}
                >
                  {processingProgress}%
                </div>
              </div>
              <p className="text-muted small mt-2">
                {processingProgress < 30 ? '📊 Validating product data...' : 
                 processingProgress < 60 ? '📸 Processing images...' : 
                 processingProgress < 90 ? '💾 Saving products...' : 
                 '✅ Finalizing upload...'}
              </p>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className={`mt-3 p-3 rounded ${uploadResult.errors ? 'bg-warning' : 'bg-success'} bg-opacity-10`}>
              <h6>✅ Upload Complete!</h6>
              <div className="row">
                <div className="col-6">
                  <p className="mb-1">📊 Total rows: {uploadResult.summary.total}</p>
                  <p className="mb-1">✅ Successful: {uploadResult.summary.successful}</p>
                  <p className="mb-1">❌ Failed: {uploadResult.summary.failed}</p>
                </div>
                <div className="col-6">
                  <p className="mb-1">📸 Images uploaded: {uploadResult.images?.uploaded || 0}</p>
                  <p className="mb-1">🖼️ Images assigned: {uploadResult.images?.assigned || 0}</p>
                  <p className="mb-1">📈 Success rate: {uploadResult.summary.successRate}</p>
                </div>
              </div>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 fw-bold text-danger">Errors:</p>
                  <ul className="small mb-0">
                    {uploadResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx} className="text-danger">{err}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>...and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
              {uploadResult.products && uploadResult.products.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 fw-bold text-success">Uploaded Products:</p>
                  <div className="d-flex flex-wrap gap-1">
                    {uploadResult.products.slice(0, 5).map((p, idx) => (
                      <Badge key={idx} bg="success" className="me-1">
                        {p.name} (₹{p.price}) {p.shippingTime && `• ${p.shippingTime}`}
                      </Badge>
                    ))}
                    {uploadResult.products.length > 5 && (
                      <Badge bg="secondary">+{uploadResult.products.length - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          {uploadStep === 1 && !uploadResult && (
            <>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowBulkUpload(false);
                  resetBulkUpload();
                }}
                disabled={uploadProgress}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleValidateExcel}
                disabled={!excelFile || uploadProgress}
              >
                {uploadProgress ? "Validating..." : "Validate & Preview"}
              </Button>
            </>
          )}
          
          {uploadStep === 2 && !uploadResult && !uploadProgress && (
            <>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setUploadStep(1);
                  setValidationData(null);
                }}
                disabled={uploadProgress}
              >
                <FaArrowLeft className="me-1" /> Back
              </Button>
              <Button 
                variant="success" 
                onClick={handleProcessBulkUpload}
                disabled={validationData.summary.valid === 0 || uploadProgress}
              >
                {uploadProgress ? "Processing..." : `Upload ${validationData.summary.valid} Products`}
                <FaArrowRight className="ms-1" />
              </Button>
            </>
          )}

          {uploadProgress && (
            <Button variant="secondary" disabled>
              <Spinner animation="border" size="sm" className="me-2" />
              Processing...
            </Button>
          )}

          {uploadResult && (
            <Button variant="primary" onClick={() => {
              setShowBulkUpload(false);
              resetBulkUpload();
            }}>
              Done
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Product;