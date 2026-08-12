// pages/Coupon/Coupon.js - COMPLETE WITH SUSPENSION HANDLING

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
  FaClock,
  FaCopy,
  FaBan,
  FaExclamationTriangle
} from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

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
    minOrderAmount: 0,
    maxDiscount: 0,
    description: "",
    usageLimit: 0
  });

  // Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  const token = localStorage.getItem("token");

  // ================= CHECK VENDOR STATUS =================
  const checkVendorStatus = async () => {
    try {
      // ✅ Use /auth/status - VENDOR route
      const res = await axios.get(`${API_URL}/vendor/status`, {
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
      
      // ✅ Fallback: Check from localStorage
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

  // ================= FETCH COUPONS =================
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.data && res.data.success) {
        setCoupons(res.data.coupons || []);
      } else if (Array.isArray(res.data)) {
        setCoupons(res.data);
      } else {
        setCoupons([]);
      }
      
      setError("");
    } catch (err) {
      console.error("Error fetching coupons:", err);
      if (err.response?.status === 403) {
        setError("Access denied. Please check your account status.");
      } else {
        setError(err.response?.data?.message || "Failed to fetch coupons");
      }
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH VENDOR PRODUCTS =================
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await axios.get(`${API_URL}/products/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.data && res.data.products) {
        setProducts(res.data.products);
      } else if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching vendor products:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    const initialize = async () => {
      const isSuspended = await checkVendorStatus();
      if (!isSuspended) {
        await Promise.all([fetchCoupons(), fetchProducts()]);
      } else {
        setLoading(false);
        setProductsLoading(false);
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
    if (error) {
      const timer = setTimeout(() => setError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // ================= DELETE COUPON =================
  const handleDelete = async (id) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot delete coupons while account is suspended.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    
    try {
      await axios.delete(`${API_URL}/coupons/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(coupons.filter((c) => c._id !== id));
      setSuccess("Coupon deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  // ================= EDIT COUPON =================
  const handleEdit = (coupon) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot edit coupons while account is suspended.");
      return;
    }
    
    let productIds = [];
    if (coupon.products && Array.isArray(coupon.products)) {
      productIds = coupon.products.map(p => p._id || p);
    } else if (coupon.productIds && Array.isArray(coupon.productIds)) {
      productIds = coupon.productIds.map(p => p._id || p);
    }
      
    setEditData({ 
      ...coupon,
      productIds: productIds
    });
    setShowEdit(true);
  };

  // ================= SAVE EDIT =================
  const handleSaveEdit = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot update coupons while account is suspended.");
      return;
    }
    
    try {
      const payload = {
        code: editData.code,
        discount: parseFloat(editData.discount),
        type: editData.type,
        products: editData.productIds || [],
        expiryDate: editData.expiryDate,
        active: editData.active,
        minOrderAmount: parseFloat(editData.minOrderAmount) || 0,
        maxDiscount: parseFloat(editData.maxDiscount) || 0,
        description: editData.description || "",
        usageLimit: parseInt(editData.usageLimit) || 0
      };

      await axios.put(`${API_URL}/coupons/${editData._id}`, payload, {
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
    if (suspensionInfo.isSuspended) {
      setError("Cannot add coupons while account is suspended.");
      return;
    }
    
    if (!newCoupon.code || !newCoupon.discount || !newCoupon.expiryDate) {
      setError("Please fill all required fields (Code, Discount, Expiry Date)");
      return;
    }

    try {
      const payload = {
        code: newCoupon.code,
        discount: parseFloat(newCoupon.discount),
        type: newCoupon.type,
        products: newCoupon.products || [],
        expiryDate: newCoupon.expiryDate,
        active: newCoupon.active,
        minOrderAmount: parseFloat(newCoupon.minOrderAmount) || 0,
        maxDiscount: parseFloat(newCoupon.maxDiscount) || 0,
        description: newCoupon.description || "",
        usageLimit: parseInt(newCoupon.usageLimit) || 0
      };

      await axios.post(`${API_URL}/coupons`, payload, {
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
        minOrderAmount: 0,
        maxDiscount: 0,
        description: "",
        usageLimit: 0
      });

      fetchCoupons();
      setSuccess("Coupon added successfully!");
    } catch (err) {
      console.error("Add coupon error:", err);
      setError(err.response?.data?.message || "Add coupon failed");
    }
  };

  // ================= COPY CODE =================
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess("Coupon code copied!");
  };

  // ================= HELPER FUNCTIONS =================
  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusBadge = (coupon) => {
    const isActive = coupon.active !== undefined ? coupon.active : coupon.isActive;
    if (!isActive) {
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
    const active = coupons.filter(c => (c.active || c.isActive) && !isExpired(c.expiryDate)).length;
    const expired = coupons.filter(c => isExpired(c.expiryDate)).length;
    const inactive = coupons.filter(c => !(c.active || c.isActive)).length;
    return { total, active, expired, inactive };
  };

  const stats = getStats();

  if (loading || productsLoading) {
    return (
      <>
        <Header />
        <Sidebar />
        <main className="admin-content mt-5">
          <Container>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading coupons...</p>
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
                    <small>Coupon management is disabled while your account is suspended.</small>
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* STATS CARDS */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <FaTag size={30} className="text-primary mb-2" />
                  <h5>Total Coupons</h5>
                  <h3>{stats.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <FaCheckCircle size={30} className="text-success mb-2" />
                  <h5>Active</h5>
                  <h3>{stats.active}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <FaClock size={30} className="text-danger mb-2" />
                  <h5>Expired</h5>
                  <h3>{stats.expired}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
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
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
              <Badge bg="secondary" className="ms-2">
                {coupons.length} coupons
              </Badge>
            </motion.h4>

            {!suspensionInfo.isSuspended ? (
              <Button onClick={() => setShowAdd(true)} variant="primary">
                <FaPlus /> Add Coupon
              </Button>
            ) : (
              <Button variant="secondary" disabled>
                <FaBan className="me-1" /> Coupon Management Disabled
              </Button>
            )}
          </div>

          {/* Suspended Message */}
          {suspensionInfo.isSuspended && (
            <Alert variant="secondary" className="text-center py-4 mb-3">
              <FaBan style={{ fontSize: '36px', color: '#6c757d' }} />
              <h5 className="mt-2">Coupon Management Restricted</h5>
              <p>Your account has been suspended. You cannot add, edit, or delete coupons.</p>
              <small>Please contact admin to resolve this issue.</small>
            </Alert>
          )}

          {/* TABLE */}
          <div className="table-responsive">
            <Table bordered hover className={suspensionInfo.isSuspended ? 'opacity-50' : ''}>
              <thead className="table-light">
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
                    <td colSpan="7" className="text-center py-4 text-muted">
                      {suspensionInfo.isSuspended 
                        ? 'Coupons are hidden while account is suspended' 
                        : 'No coupons found. Click "Add Coupon" to create one.'}
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon._id} className={suspensionInfo.isSuspended ? 'table-secondary' : ''}>
                      <td>
                        <strong className="text-primary">{coupon.code}</strong>
                        {!suspensionInfo.isSuspended && (
                          <Button
                            variant="link"
                            size="sm"
                            className="ms-1 p-0"
                            onClick={() => copyCode(coupon.code)}
                          >
                            <FaCopy size={12} />
                          </Button>
                        )}
                      </td>
                      <td>
                        {coupon.type === "percentage" ? `${coupon.discount}%` : `₹${coupon.discount}`}
                      </td>
                      <td>{getTypeBadge(coupon.type)}</td>
                      <td>
                        {coupon.products && coupon.products.length > 0 ? (
                          <span>{coupon.products.length} product(s)</span>
                        ) : (
                          <span className="text-muted">All products</span>
                        )}
                      </td>
                      <td>
                        {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>{getStatusBadge(coupon)}</td>
                      <td>
                        {!suspensionInfo.isSuspended ? (
                          <>
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
                          </>
                        ) : (
                          <Badge bg="secondary">Locked</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Footer Info */}
          {!suspensionInfo.isSuspended && (
            <div className="text-muted small">
              Total Coupons: {coupons.length}
              {products.length > 0 && ` | Available Products: ${products.length}`}
            </div>
          )}
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
              <Form.Text className="text-muted">Code will be automatically uppercase</Form.Text>
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
                    min="0"
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
              <Form.Text className="text-muted d-block mb-2">
                <small>Select specific products or leave empty for all products</small>
              </Form.Text>
              <Form.Select
                multiple
                size={6}
                value={newCoupon.products}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  const filtered = selected.filter(id => id !== "");
                  setNewCoupon({ ...newCoupon, products: filtered });
                }}
              >
                <option value="">-- All Products (Company-wide) --</option>
                {products.length === 0 ? (
                  <option value="" disabled>No products found</option>
                ) : (
                  products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} - ₹{product.price}
                    </option>
                  ))
                )}
              </Form.Select>
              <Form.Text className="text-muted">
                Hold Ctrl/Cmd to select multiple products. Leave empty for all products.
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Order Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0 for no minimum"
                    value={newCoupon.minOrderAmount}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })
                    }
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Discount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0 for no maximum"
                    value={newCoupon.maxDiscount}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })
                    }
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Optional description"
                value={newCoupon.description}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, description: e.target.value })
                }
              />
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
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Usage Limit</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0 for unlimited"
                    value={newCoupon.usageLimit}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, usageLimit: e.target.value })
                    }
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>

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

            {newCoupon.products.length > 0 && (
              <Alert variant="info" className="mt-2">
                <small>
                  <strong>Selected Products:</strong> {newCoupon.products.length} product(s) selected
                </small>
              </Alert>
            )}
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
                      min="0"
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
                <Form.Text className="text-muted d-block mb-2">
                  <small>Select specific products or leave empty for all products</small>
                </Form.Text>
                <Form.Select
                  multiple
                  size={6}
                  value={editData.productIds || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    const filtered = selected.filter(id => id !== "");
                    setEditData({ ...editData, productIds: filtered });
                  }}
                >
                  <option value="">-- All Products (Company-wide) --</option>
                  {products.length === 0 ? (
                    <option value="" disabled>No products found</option>
                  ) : (
                    products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} - ₹{product.price}
                      </option>
                    ))
                  )}
                </Form.Select>
                <Form.Text className="text-muted">
                  Hold Ctrl/Cmd to select multiple products
                </Form.Text>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Min Order Amount (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0 for no minimum"
                      value={editData.minOrderAmount || 0}
                      onChange={(e) =>
                        setEditData({ ...editData, minOrderAmount: e.target.value })
                      }
                      min="0"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Discount (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0 for no maximum"
                      value={editData.maxDiscount || 0}
                      onChange={(e) =>
                        setEditData({ ...editData, maxDiscount: e.target.value })
                      }
                      min="0"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Optional description"
                  value={editData.description || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                />
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
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Usage Limit</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0 for unlimited"
                      value={editData.usageLimit || 0}
                      onChange={(e) =>
                        setEditData({ ...editData, usageLimit: e.target.value })
                      }
                      min="0"
                    />
                  </Form.Group>
                </Col>
              </Row>

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

              {editData.productIds && editData.productIds.length > 0 && (
                <Alert variant="info" className="mt-2">
                  <small>
                    <strong>Selected Products:</strong> {editData.productIds.length} product(s) selected
                  </small>
                </Alert>
              )}
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