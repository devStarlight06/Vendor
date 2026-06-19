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
} from "react-bootstrap";
import { motion } from "framer-motion";
import { 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaTag, 
  FaCheckCircle, 
  FaTimesCircle,
  FaClock 
} from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

// const API_URL = "http://localhost:5001/api/coupons"; // Your backend URL
// const PRODUCT_API_URL = "http://localhost:5001/api/products"; // To fetch vendor products
const API_URL = process.env.REACT_APP_API_BASE + "/coupons"; // Use environment variable for API base URL
const PRODUCT_API_URL = process.env.REACT_APP_API_BASE + "/products"; // Use environment variable for API base URL
const Coupon = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [editData, setEditData] = useState(null);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount: "",
    type: "percentage",
    products: [],
    expiryDate: "",
    active: true,
  });

  const token = localStorage.getItem("token");

  // ================= FETCH COUPONS =================
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(res.data.coupons);
      setError("");
    } catch (err) {
      console.error("Error fetching coupons:", err);
      setError("Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH VENDOR PRODUCTS =================
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await axios.get(`${PRODUCT_API_URL}/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= DELETE COUPON =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(coupons.filter((c) => c._id !== id));
      setSuccess("Coupon deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  // ================= EDIT COUPON =================
  const handleEdit = (coupon) => {
    setEditData({ 
      ...coupon,
      // Convert products array to product IDs for multi-select
      productIds: coupon.products.map(p => p._id || p)
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        code: editData.code,
        discount: editData.discount,
        type: editData.type,
        products: editData.productIds || [],
        expiryDate: editData.expiryDate,
        active: editData.active,
      };

      await axios.put(`${API_URL}/${editData._id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setShowEdit(false);
      fetchCoupons();
      setSuccess("Coupon updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      setError(err.response?.data?.message || "Update failed");
    }
  };

  // ================= ADD COUPON =================
  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount || !newCoupon.expiryDate) {
      setError("Please fill all required fields (Code, Discount, Expiry Date)");
      return;
    }

    try {
      const payload = {
        code: newCoupon.code,
        discount: newCoupon.discount,
        type: newCoupon.type,
        products: newCoupon.products || [],
        expiryDate: newCoupon.expiryDate,
        active: newCoupon.active,
      };

      await axios.post(API_URL, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setShowAdd(false);
      setNewCoupon({
        code: "",
        discount: "",
        type: "percentage",
        products: [],
        expiryDate: "",
        active: true,
      });

      fetchCoupons();
      setSuccess("Coupon added successfully!");
    } catch (err) {
      console.error("Add coupon error:", err);
      setError(err.response?.data?.message || "Add coupon failed");
    }
  };

  // ================= HELPER FUNCTIONS =================
  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusBadge = (coupon) => {
    if (!coupon.active) {
      return <Badge bg="secondary">Inactive</Badge>;
    }
    if (isExpired(coupon.expiryDate)) {
      return <Badge bg="danger">Expired</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  const getTypeBadge = (type) => {
    return type === "percentage" ? 
      <Badge bg="info">%</Badge> : 
      <Badge bg="warning">₹</Badge>;
  };

  // ================= STATS =================
  const getStats = () => {
    const total = coupons.length;
    const active = coupons.filter(c => c.active && !isExpired(c.expiryDate)).length;
    const expired = coupons.filter(c => isExpired(c.expiryDate)).length;
    const inactive = coupons.filter(c => !c.active).length;
    return { total, active, expired, inactive };
  };

  const stats = getStats();

  if (loading || productsLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Loading coupons...
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

          {/* STATS CARDS */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaTag size={30} className="text-primary mb-2" />
                  <h5>Total Coupons</h5>
                  <h3>{stats.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaCheckCircle size={30} className="text-success mb-2" />
                  <h5>Active</h5>
                  <h3>{stats.active}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaClock size={30} className="text-danger mb-2" />
                  <h5>Expired</h5>
                  <h3>{stats.expired}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaTimesCircle size={30} className="text-secondary mb-2" />
                  <h5>Inactive</h5>
                  <h3>{stats.inactive}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              My Coupons
            </motion.h4>

            <Button onClick={() => setShowAdd(true)}>
              <FaPlus /> Add Coupon
            </Button>
          </div>

          {/* TABLE */}
          <Table responsive bordered hover>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Type</th>
                <th>Products</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No coupons found</td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon._id}>
                    <td>
                      <strong>{coupon.code}</strong>
                    </td>
                    <td>
                      {coupon.type === "percentage" ? `${coupon.discount}%` : `₹${coupon.discount}`}
                    </td>
                    <td>{getTypeBadge(coupon.type)}</td>
                    <td>
                      {coupon.products && coupon.products.length > 0 ? (
                        <span>{coupon.products.length} products</span>
                      ) : (
                        <span className="text-muted">All products</span>
                      )}
                    </td>
                    <td>
                      {new Date(coupon.expiryDate).toLocaleDateString()}
                    </td>
                    <td>{getStatusBadge(coupon)}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        onClick={() => handleEdit(coupon)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(coupon._id)}
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

      {/* ================= ADD COUPON MODAL ================= */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Coupon</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Coupon Code *</Form.Label>
              <Form.Control
                placeholder="Enter coupon code (e.g., SUMMER25)"
                value={newCoupon.code}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })
                }
              />
              <small className="text-muted">Code will be automatically uppercase</small>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount *</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter discount value"
                    value={newCoupon.discount}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, discount: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Type *</Form.Label>
                  <Form.Select
                    value={newCoupon.type}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, type: e.target.value })
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Apply to Products</Form.Label>
              <Form.Select
                multiple
                size={4}
                value={newCoupon.products}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setNewCoupon({ ...newCoupon, products: selected });
                }}
              >
                <option value="">All Products (Leave empty for all)</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} - ₹{product.price}
                  </option>
                ))}
              </Form.Select>
              <small className="text-muted">Hold Ctrl/Cmd to select multiple products. Leave empty for all products.</small>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Expiry Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={newCoupon.expiryDate}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, expiryDate: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={newCoupon.active}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, active: e.target.value === "true" })
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddCoupon}>
            Add Coupon
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= EDIT COUPON MODAL ================= */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Coupon</Modal.Title>
        </Modal.Header>

        {editData && (
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Coupon Code</Form.Label>
                <Form.Control
                  value={editData.code}
                  onChange={(e) =>
                    setEditData({ ...editData, code: e.target.value.toUpperCase() })
                  }
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Discount</Form.Label>
                    <Form.Control
                      type="number"
                      value={editData.discount}
                      onChange={(e) =>
                        setEditData({ ...editData, discount: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Discount Type</Form.Label>
                    <Form.Select
                      value={editData.type}
                      onChange={(e) =>
                        setEditData({ ...editData, type: e.target.value })
                      }
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Apply to Products</Form.Label>
                <Form.Select
                  multiple
                  size={4}
                  value={editData.productIds || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setEditData({ ...editData, productIds: selected });
                  }}
                >
                  <option value="">All Products</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} - ₹{product.price}
                    </option>
                  ))}
                </Form.Select>
                <small className="text-muted">Hold Ctrl/Cmd to select multiple products</small>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Expiry Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={editData.expiryDate ? new Date(editData.expiryDate).toISOString().split('T')[0] : ''}
                      onChange={(e) =>
                        setEditData({ ...editData, expiryDate: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={editData.active}
                      onChange={(e) =>
                        setEditData({ ...editData, active: e.target.value === "true" })
                      }
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
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
    </>
  );
};

export default Coupon;