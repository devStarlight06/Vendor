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
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaEdit, FaTrash, FaPlus, FaFileExcel, FaSync } from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = "https://api.brandelvendor.starlighttechlabsindia.com/api/products";
// ✅ CORRECT: Admin category API endpoint
const ADMIN_CATEGORY_API_URL = "https://api.brandelsuperadmin.starlighttechlabsindia.com/api/category";
// const API_URL = "http://localhost:5001/api/products";
// // ✅ CORRECT: Admin category API endpoint
// const ADMIN_CATEGORY_API_URL = "https://api.brandelsuperadmin.starlighttechlabsindia.com/api/category";

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

  const [editData, setEditData] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    images: [],
  });

  const [excelFile, setExcelFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const token = localStorage.getItem("token");

  // ================= FETCH CATEGORIES FROM ADMIN =================
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setError("");
      
      const res = await axios.get(`${ADMIN_CATEGORY_API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle response format
      let categoriesData = [];
      if (res.data.success && Array.isArray(res.data.categories)) {
        categoriesData = res.data.categories;
      } else if (Array.isArray(res.data)) {
        categoriesData = res.data;
      } else if (res.data.categories && Array.isArray(res.data.categories)) {
        categoriesData = res.data.categories;
      }
      
      // Filter only active categories for vendors
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

  // ================= SYNC CATEGORIES MANUALLY =================
  const syncCategories = async () => {
    setSyncing(true);
    await fetchCategories();
    setSyncing(false);
    setSuccess("Categories synced successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // ================= FETCH PRODUCTS =================
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(products.filter((p) => p._id !== id));
      setSuccess("Product deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  // ================= EDIT =================
  const handleEdit = (product) => {
    setEditData({ ...product });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    try {
      const formData = new FormData();

      formData.append("name", editData.name);
      formData.append("price", editData.price);
      formData.append("category", editData.category);
      formData.append("description", editData.description || "");

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

  // ================= ADD PRODUCT =================
  const handleAddProduct = async () => {
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
        images: [],
      });

      fetchProducts();
      setSuccess("Product added successfully!");
    } catch (err) {
      console.error("Add product error:", err);
      setError("Add product failed");
    }
  };

  // ================= DOWNLOAD EXCEL TEMPLATE =================
  const downloadTemplate = async () => {
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

  // ================= BULK UPLOAD EXCEL =================
  const handleBulkUpload = async () => {
    if (!excelFile) {
      setError("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("excelFile", excelFile);

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
        setSuccess(`✅ ${response.data.message}`);
        fetchProducts();
        setShowBulkUpload(false);
        setExcelFile(null);
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

  if (loading || categoriesLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Loading products...
      </div>
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

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              My Products
            </motion.h4>

            <div>
              {/* <Button 
                variant="info" 
                className="me-2"
                onClick={syncCategories}
                disabled={syncing}
              >
                <FaSync className={syncing ? "fa-spin" : ""} /> 
                {syncing ? "Syncing..." : "Sync Categories"}
              </Button> */}
              <Button 
                variant="success" 
                className="me-2"
                onClick={() => setShowBulkUpload(true)}
              >
                <FaFileExcel /> Bulk Upload Excel
              </Button>
              <Button onClick={() => setShowAdd(true)}>
                <FaPlus /> Add Product
              </Button>
            </div>
          </div>

          {/* Category Info Alert */}
          {categories.length === 0 && (
            <Alert variant="warning">
              <Alert.Heading>No Categories Available!</Alert.Heading>
              <p>
                No active categories found. Please contact the admin to add categories 
                or click the "Sync Categories" button to refresh.
              </p>
            </Alert>
          )}

          {/* TABLE */}
          <Table responsive bordered hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">No products found</td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>₹{item.price}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        onClick={() => handleEdit(item)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(item._id)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Container>
      </main>

      {/* ================= ADD MODAL WITH CATEGORY DROPDOWN ================= */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Product</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
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
              {categories.length === 0 && (
                <small className="text-danger">
                  No categories available. Click "Sync Categories" to load categories from admin.
                </small>
              )}
            </Form.Group>

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

      {/* ================= EDIT MODAL WITH CATEGORY DROPDOWN ================= */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Product</Modal.Title>
        </Modal.Header>

        {editData && (
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Product Name</Form.Label>
                <Form.Control
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                />
              </Form.Group>

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

      {/* ================= BULK UPLOAD EXCEL MODAL ================= */}
      <Modal show={showBulkUpload} onHide={() => {
        setShowBulkUpload(false);
        setExcelFile(null);
        setUploadResult(null);
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
            </p>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Select Excel File (.xlsx, .xls)</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files[0])}
              disabled={uploadProgress}
            />
          </Form.Group>

          {uploadResult && (
            <div className={`mt-3 p-3 rounded ${uploadResult.errors ? 'bg-warning' : 'bg-success'} bg-opacity-10`}>
              <h6>Upload Summary:</h6>
              <p className="mb-1">📊 Total rows processed: {uploadResult.totalRows}</p>
              <p className="mb-1">✅ Successfully uploaded: {uploadResult.successfulRows}</p>
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
              <Spinner animation="border" size="sm" /> Uploading products...
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
            {uploadProgress ? "Uploading..." : "Upload Excel File"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Product;