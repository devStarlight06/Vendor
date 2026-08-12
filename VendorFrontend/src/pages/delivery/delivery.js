// delivery/Delivery.js - COMPLETE WITH SUSPENSION HANDLING

import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaTruck, FaClock, FaTimesCircle, FaBan, FaExclamationTriangle } from "react-icons/fa";

import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";
import "./delivery.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const Delivery = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null,
    statusHistory: []
  });

  /* ---------------- CHECK VENDOR STATUS ---------------- */
  const checkVendorStatus = async (headers) => {
    try {
      // ✅ Try /auth/status first (vendor route)
      const statusRes = await fetch(`${API_BASE}/vendor/status`, { headers });
      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data && data.isSuspended) {
          setSuspensionInfo({
            isSuspended: true,
            reason: data.suspensionReason || 'No reason provided',
            suspendedAt: data.suspendedAt,
            statusHistory: data.recentStatusChanges || []
          });
          return true;
        }
        return false;
      }
    } catch (statusErr) {
      console.warn("Status check error (auth/status):", statusErr.message);
    }

    // ✅ Fallback: Try /auth/profile
    try {
      const profileRes = await fetch(`${API_BASE}/auth/profile`, { headers });
      if (profileRes.ok) {
        const data = await profileRes.json();
        const vendorData = data.vendor || data;
        if (vendorData && vendorData.status === 'suspended') {
          setSuspensionInfo({
            isSuspended: true,
            reason: vendorData.suspensionReason || 'No reason provided',
            suspendedAt: vendorData.suspendedAt,
            statusHistory: vendorData.statusHistory || []
          });
          return true;
        }
        return false;
      }
    } catch (profileErr) {
      console.warn("Status check error (auth/profile):", profileErr.message);
    }

    // ✅ Final fallback: Check localStorage
    try {
      const storedVendor = JSON.parse(localStorage.getItem('vendorData') || '{}');
      if (storedVendor.status === 'suspended') {
        setSuspensionInfo({
          isSuspended: true,
          reason: storedVendor.suspensionReason || 'No reason provided',
          suspendedAt: storedVendor.suspendedAt,
          statusHistory: storedVendor.statusHistory || []
        });
        return true;
      }
    } catch (localErr) {
      console.warn("LocalStorage status check error:", localErr.message);
    }

    return false;
  };

  /* ---------------- FETCH VENDOR ORDERS ---------------- */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // ✅ Check vendor status first
        const isSuspended = await checkVendorStatus(headers);
        if (isSuspended) {
          setLoading(false);
          return; // ✅ Stop fetching orders if suspended
        }

        // ✅ Fetch orders if not suspended
        const res = await fetch(`${API_BASE}/orders/my-orders`, { headers });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Orders API response:", data);

        // ✅ Handle both array and object responses
        let ordersArray = [];
        if (Array.isArray(data)) {
          ordersArray = data;
        } else if (data && data.orders && Array.isArray(data.orders)) {
          ordersArray = data.orders;
        } else if (data && Array.isArray(data.data)) {
          ordersArray = data.data;
        } else {
          ordersArray = [];
          console.warn("Unexpected API response format:", data);
        }

        const statusOrder = { Delivered: 1, Pending: 2, Cancelled: 3 };

        const formatted = ordersArray
          .map(order => ({
            _id: order._id || order.id || 'N/A',
            customer: order.shippingAddress?.name || order.customerName || "Customer",
            customerEmail: order.shippingAddress?.email || order.customerEmail || "",
            customerPhone: order.shippingAddress?.phone || order.customerPhone || "",
            status: order.orderStatus || order.status || "Pending",
            createdAt: order.createdAt || order.created_at || new Date().toISOString(),
            totalPrice: order.totalPrice || order.total || 0,
          }))
          .sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

        setOrders(formatted);
        setLoading(false);
      } catch (err) {
        console.error("Delivery fetch error:", err);
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /* ---------------- COUNTS ---------------- */
  const deliveredCount = orders.filter(o => o.status === "Delivered").length;
  const pendingCount = orders.filter(o => o.status === "Pending").length;
  const cancelledCount = orders.filter(o => o.status === "Cancelled").length;
  const totalOrders = orders.length;

  /* ---------------- GET STATUS ICON ---------------- */
  const getStatusIcon = (status) => {
    switch(status) {
      case 'Delivered': return <FaTruck className="me-1" />;
      case 'Pending': return <FaClock className="me-1" />;
      case 'Cancelled': return <FaTimesCircle className="me-1" />;
      default: return <FaClock className="me-1" />;
    }
  };

  return (
    <div>
      <Header />
      <Sidebar />

      <div className="admin-layout">
        <main className="admin-content mt-5">
          <Container fluid>
            <motion.h4
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 d-flex align-items-center"
            >
              <FaTruck className="me-2" />
              Delivery Status
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
              <Badge bg="secondary" className="ms-2">
                {orders.length} orders
              </Badge>
            </motion.h4>

            {/* 🚫 SUSPENSION ALERT */}
            {suspensionInfo.isSuspended && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
                        <small>Delivery information is not available while your account is suspended.</small>
                      </p>
                    </div>
                  </div>
                </Alert>
              </motion.div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading delivery orders...</p>
              </div>
            ) : suspensionInfo.isSuspended ? (
              /* ✅ Show when suspended */
              <Alert variant="secondary" className="text-center py-5">
                <FaBan className="me-2" style={{ fontSize: '48px', color: '#6c757d' }} />
                <h4 className="mt-3">Access Restricted</h4>
                <p className="text-muted">
                  Delivery information is unavailable while your account is suspended.
                </p>
                <Alert variant="info" className="mt-3 text-start">
                  <strong>What to do:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Contact admin to resolve the suspension</li>
                    <li>Check your email for suspension notice</li>
                    <li>Review the reason provided above</li>
                  </ul>
                </Alert>
                <small className="text-muted d-block mt-3">
                  {suspensionInfo.suspendedAt && (
                    <>Suspended since: {new Date(suspensionInfo.suspendedAt).toLocaleString()}</>
                  )}
                </small>
              </Alert>
            ) : (
              <>
                {/* ===== STATS CARDS ===== */}
                <Row className="g-4 mb-4">
                  <Col md={4}>
                    <motion.div whileHover={{ scale: 1.04 }}>
                      <Card className="delivery-card delivered">
                        <FaTruck className="icon" />
                        <h6>Delivered Orders</h6>
                        <h3>{deliveredCount}</h3>
                        <small className="text-muted">
                          {totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0}% delivery rate
                        </small>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col md={4}>
                    <motion.div whileHover={{ scale: 1.04 }}>
                      <Card className="delivery-card pending">
                        <FaClock className="icon" />
                        <h6>Pending Orders</h6>
                        <h3>{pendingCount}</h3>
                        <small className="text-muted">Awaiting delivery</small>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col md={4}>
                    <motion.div whileHover={{ scale: 1.04 }}>
                      <Card className="delivery-card cancelled">
                        <FaTimesCircle className="icon" />
                        <h6>Cancelled Orders</h6>
                        <h3>{cancelledCount}</h3>
                        <small className="text-muted">Order cancelled</small>
                      </Card>
                    </motion.div>
                  </Col>
                </Row>

                {/* ===== TABLE ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="table-wrapper"
                >
                  <Table responsive bordered hover>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            <FaTruck className="me-2" />
                            No orders found
                          </td>
                        </tr>
                      ) : (
                        orders.map((order, index) => (
                          <motion.tr
                            key={order._id || index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={
                              order.status === "Delivered" ? "table-success" :
                              order.status === "Pending" ? "table-warning" :
                              order.status === "Cancelled" ? "table-danger" : ""
                            }
                          >
                            <td className="fw-semibold">
                              {order._id && order._id.length > 8 
                                ? order._id.slice(-8) 
                                : order._id || 'N/A'}
                            </td>
                            <td>
                              <div>{order.customer}</div>
                              <small className="text-muted">{order.customerEmail}</small>
                            </td>
                            <td>{order.customerPhone || 'N/A'}</td>
                            <td>
                              <Badge
                                bg={
                                  order.status === "Delivered"
                                    ? "success"
                                    : order.status === "Pending"
                                    ? "warning"
                                    : "danger"
                                }
                                className="px-3 py-2"
                              >
                                {getStatusIcon(order.status)}
                                {order.status}
                              </Badge>
                            </td>
                            <td className="fw-bold">
                              ₹{Number(order.totalPrice || 0).toFixed(2)}
                            </td>
                            <td>
                              {order.createdAt 
                                ? new Date(order.createdAt).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "N/A"}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </motion.div>

                {/* ===== Footer Info ===== */}
                <div className="mt-3 text-muted small d-flex justify-content-between">
                  <span>
                    <FaTruck className="me-1" />
                    Showing {orders.length} orders
                  </span>
                  <span>
                    Last updated: {new Date().toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Delivery;