// Product.js - UPDATED WITH IMAGE UPLOADER SUPPORT
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
  FaTimes
} from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

 const API_URL = "https://api-vendor.native91.com/api/products";
const ADMIN_CATEGORY_API_URL = "https://api-admin.native91.com/api/category";
 const AUTH_API_URL = "https://api-vendor.native91.com/api/vendor";
 const BASE_URL = "https://api-vendor.native91.com";

//const API_URL = "http://localhost:5001/api/products";
//const ADMIN_CATEGORY_API_URL = "http://localhost:7000/api/category";
//const AUTH_API_URL = "http://localhost:5001/api/vendor";
//const BASE_URL = "http://localhost:5001";

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
  const [showImageUploader, setShowImageUploader] = useState(false);

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
    }
  });

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

  // Image Uploader States
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageUploadProgress, setImageUploadProgress] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
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

  // ================= FETCH IMAGES LIST =================
  const fetchImagesList = async () => {
    try {
      setLoadingImages(true);
      const res = await axios.get(`${API_URL}/images/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setImageList(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      setError("Failed to load images");
    } finally {
      setLoadingImages(false);
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
        await Promise.all([fetchProducts(), fetchCategories()]);
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
        }
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
      dimensions: product.dimensions || { length: 0, width: 0, height: 0, unit: "cm" }
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
      link.setAttribute("download", "product_template_with_categories.xlsx");
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

  // ================= BULK UPLOAD =================
  const handleBulkUpload = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot upload products while account is suspended.");
      return;
    }
    
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

    try {
      const response = await axios.post(`${API_URL}/bulk-upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadResult(response.data);
      
      if (response.data.successfulRows > 0) {
        setSuccess(`✅ ${response.data.message} (${response.data.imagesUploaded || 0} images uploaded)`);
        fetchProducts();
        setShowBulkUpload(false);
        setExcelFile(null);
        setBulkImages([]);
      } else {
        setError("No products were uploaded. Please check the file format.");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setError(err.response?.data?.message || "Bulk upload failed");
    } finally {
      setUploadProgress(false);
    }
  };

  // ================= IMAGE UPLOADER FUNCTIONS =================
  
  // Upload images using the new image uploader endpoint
  const handleImageUpload = async () => {
    if (selectedImages.length === 0) {
      setError("Please select images to upload");
      return;
    }

    setImageUploadProgress(true);
    setError("");

    try {
      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append("images", file);
      });

      const response = await axios.post(`${API_URL}/upload-images`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });

      if (response.data.success) {
        const uploadedImages = response.data.data;
        setUploadedImageUrls(uploadedImages.map(img => img.path));
        setSuccess(`✅ ${uploadedImages.length} images uploaded successfully!`);
        setSelectedImages([]);
        fetchImagesList(); // Refresh the image list
      }
    } catch (err) {
      console.error("Image upload error:", err);
      setError(err.response?.data?.message || "Failed to upload images");
    } finally {
      setImageUploadProgress(false);
    }
  };

  // Delete an image
  const handleDeleteImage = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      await axios.delete(`${API_URL}/image/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(`✅ Image deleted successfully!`);
      fetchImagesList();
    } catch (err) {
      console.error("Image delete error:", err);
      setError(err.response?.data?.message || "Failed to delete image");
    }
  };

  // Select images for upload
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(files);
  };

  // Remove selected image
  const removeSelectedImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
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
                    variant="info" 
                    className="me-2"
                    onClick={() => setShowImageUploader(true)}
                  >
                    <FaUpload /> Upload Images
                  </Button>
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

          {/* TABLE WITH IMAGE COLUMN */}
          <Table responsive bordered hover className={suspensionInfo.isSuspended ? 'opacity-50' : ''}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Size/Weight</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">
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

      {/* ================= BULK UPLOAD MODAL ================= */}
      <Modal show={showBulkUpload} onHide={() => {
        setShowBulkUpload(false);
        setExcelFile(null);
        setUploadResult(null);
        setBulkImages([]);
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Bulk Upload Products via Excel</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="mb-3">
            <Button variant="info" onClick={downloadTemplate} className="mb-3">
              📥 Download Excel Template
            </Button>
            <p className="text-muted small">
              Download the template, fill in your product details, and upload the file here.
              <br />
              <strong>📸 Image Upload Options:</strong>
              <br />
              1. <strong>In Excel:</strong> Specify image paths (e.g., /uploads/product1.jpg)
              <br />
              2. <strong>Upload Images:</strong> Select image files below to upload with your products
              <br />
              <span className="text-warning">⚠️ If you specify image paths in Excel, the image files must already exist in the uploads folder.</span>
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
                ✅ Selected: {excelFile.name}
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
                • If you specify image paths in Excel, those will be used instead
                <br />
                • Supported formats: JPG, PNG, GIF, WebP
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

          {uploadResult && (
            <div className={`mt-3 p-3 rounded ${uploadResult.errors ? 'bg-warning' : 'bg-success'} bg-opacity-10`}>
              <h6>Upload Summary:</h6>
              <p className="mb-1">📊 Total rows processed: {uploadResult.totalRows}</p>
              <p className="mb-1">✅ Successfully uploaded: {uploadResult.successfulRows}</p>
              <p className="mb-1">🖼️ Images uploaded: {uploadResult.imagesUploaded || 0}</p>
              <p className="mb-1">📸 Products with images: {uploadResult.imagesAssigned || 0}</p>
              <p className="mb-1">❌ Failed rows: {uploadResult.failedRows}</p>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 fw-bold">Errors:</p>
                  <ul className="small">
                    {uploadResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>...and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {uploadProgress && (
            <div className="text-center mt-3">
              <Spinner animation="border" size="sm" /> Uploading products and images...
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowBulkUpload(false);
              setExcelFile(null);
              setUploadResult(null);
              setBulkImages([]);
            }}
            disabled={uploadProgress}
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleBulkUpload}
            disabled={!excelFile || uploadProgress}
          >
            {uploadProgress ? "Uploading..." : "Upload Excel & Images"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= IMAGE UPLOADER MODAL ================= */}
      <Modal show={showImageUploader} onHide={() => {
        setShowImageUploader(false);
        setSelectedImages([]);
        setUploadedImageUrls([]);
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUpload className="me-2" />
            Image Uploader
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Upload Section */}
          <div className="upload-section mb-4 p-3 border rounded">
            <h6>Upload New Images</h6>
            <Form.Group className="mb-3">
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                disabled={imageUploadProgress}
              />
              <small className="text-muted">
                Select multiple images (JPG, PNG, GIF, WebP) - Max 5MB each
              </small>
            </Form.Group>

            {selectedImages.length > 0 && (
              <div className="selected-images mb-3">
                <div className="d-flex flex-wrap gap-2">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="position-relative border rounded p-1" style={{ width: '100px' }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Selected ${index + 1}`}
                        style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                      />
                      <button
                        className="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle"
                        style={{ width: '20px', height: '20px', padding: '0', fontSize: '10px', transform: 'translate(50%, -50%)' }}
                        onClick={() => removeSelectedImage(index)}
                        disabled={imageUploadProgress}
                      >
                        <FaTimes />
                      </button>
                      <small className="text-muted d-block text-truncate" style={{ fontSize: '10px' }}>
                        {file.name}
                      </small>
                    </div>
                  ))}
                </div>
                <small className="text-success">
                  {selectedImages.length} image(s) selected
                </small>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleImageUpload}
              disabled={selectedImages.length === 0 || imageUploadProgress}
            >
              {imageUploadProgress ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <FaUpload className="me-2" />
                  Upload Images
                </>
              )}
            </Button>
          </div>

          {/* Uploaded Images List */}
          <div className="uploaded-images-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Uploaded Images</h6>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={fetchImagesList}
                disabled={loadingImages}
              >
                <FaSync className={loadingImages ? "fa-spin" : ""} />
              </Button>
            </div>

            {loadingImages ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : imageList.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FaImage size={40} className="mb-2" />
                <p>No images uploaded yet</p>
              </div>
            ) : (
              <div className="d-flex flex-wrap gap-3">
                {imageList.map((image, index) => (
                  <div key={index} className="border rounded p-2" style={{ width: '150px' }}>
                    <img
                      src={image.url}
                      alt={image.filename}
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = '';
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="mt-1">
                      <small className="d-block text-truncate" title={image.filename}>
                        {image.filename}
                      </small>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted">
                          {(image.size / 1024).toFixed(1)} KB
                        </small>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteImage(image.filename)}
                        >
                          <FaTrash size={10} />
                        </Button>
                      </div>
                      <small className="text-muted d-block">
                        {new Date(image.uploadedAt).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowImageUploader(false);
            setSelectedImages([]);
            setUploadedImageUrls([]);
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Product;
