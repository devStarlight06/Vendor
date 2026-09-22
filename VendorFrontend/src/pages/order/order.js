// pages/order/order.js - COMPLETE WITH ALL INFO + STATUS UPDATE + HISTORY + SUSPENSION

import { useEffect, useState } from "react";
import {
  Container,
  Table,
  Badge,
  Button,
  Modal,
  Spinner,
  Alert,
  Form,
  Row,
  Col,
} from "react-bootstrap";
import { motion } from "framer-motion";
import {
  FaEye,
  FaBan,
  FaExclamationTriangle,
  FaTruck,
  FaBox,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaInfoCircle,
} from "react-icons/fa";

import "./order.css";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const REACT_APP_API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:5001/api";
const API = `${REACT_APP_API_BASE}/orders/my-orders`;
const UPDATE_STATUS_API = `${REACT_APP_API_BASE}/orders`;

// ✅ Status options (must match backend VALID_STATUSES)
const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending", color: "secondary", icon: <FaClock /> },
  { value: "Processing", label: "Processing", color: "info", icon: <FaBox /> },
  { value: "Shipped", label: "Shipped", color: "primary", icon: <FaTruck /> },
  {
    value: "Out for Delivery",
    label: "Out for Delivery",
    color: "warning",
    icon: <FaTruck />,
  },
  {
    value: "Delivered",
    label: "Delivered",
    color: "success",
    icon: <FaCheckCircle />,
  },
  {
    value: "Cancelled",
    label: "Cancelled",
    color: "danger",
    icon: <FaTimesCircle />,
  },
];

// ✅ Status helper (label + color + icon)
const getStatusMeta = (status) => {
  return (
    STATUS_OPTIONS.find((s) => s.value === status) || {
      value: status,
      label: status || "Pending",
      color: "secondary",
      icon: <FaClock />,
    }
  );
};

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0);
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");

  // ✅ Status update states
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [statusMsg, setStatusMsg] = useState({
    type: "",
    text: "",
    orderId: null,
  });

  // ✅ Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: "",
    suspendedAt: null,
  });

  // ============================================================
  // HELPERS
  // ============================================================
  const formatPrice = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "₹0" : `₹${num.toLocaleString("en-IN")}`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const getToken = () => localStorage.getItem("token");

  // ============================================================
  // CHECK VENDOR STATUS
  // ============================================================
  const checkVendorStatus = async (token) => {
    try {
      const res = await fetch(`${REACT_APP_API_BASE}/vendor/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.isSuspended) {
          setSuspensionInfo({
            isSuspended: true,
            reason: data.suspensionReason || "No reason provided",
            suspendedAt: data.suspendedAt,
          });
          return true;
        }
        return false;
      }
    } catch (err) {
      console.warn("Status check error:", err.message);
      try {
        const storedVendor = JSON.parse(
          localStorage.getItem("vendorData") || "{}"
        );
        if (storedVendor.status === "suspended") {
          setSuspensionInfo({
            isSuspended: true,
            reason: storedVendor.suspensionReason || "No reason provided",
            suspendedAt: storedVendor.suspendedAt,
          });
          return true;
        }
      } catch (localErr) {
        console.warn("LocalStorage error:", localErr.message);
      }
    }
    return false;
  };

  // ============================================================
  // LOAD ORDERS
  // ============================================================
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const token = getToken();
        if (!token) {
          setError("Please login to view orders");
          setLoading(false);
          return;
        }

        const isSuspended = await checkVendorStatus(token);
        if (isSuspended) {
          setLoading(false);
          return;
        }

        const res = await fetch(API, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 403) {
            setError("Access denied. Please check your account status.");
            setLoading(false);
            return;
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Orders API Response:", data);

        if (data && data.orders) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          setCommissionRate(data.commissionRate || 0);
          setPlan(data.plan || "founding");
        } else if (Array.isArray(data)) {
          setOrders(data);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch orders");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  // ============================================================
  // ✅ HANDLE STATUS UPDATE
  // ============================================================
  const handleStatusUpdate = async (orderId, newStatus) => {
    const token = getToken();
    if (!token) {
      setStatusMsg({ type: "danger", text: "Please login", orderId });
      return;
    }

    setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));
    setStatusMsg({ type: "", text: "", orderId: null });

    try {
      const res = await fetch(`${UPDATE_STATUS_API}/${orderId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      // ✅ Update list
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? {
                ...o,
                orderStatus: data.order?.orderStatus || newStatus,
                statusHistory:
                  data.order?.statusHistory || o.statusHistory || [],
              }
            : o
        )
      );

      // ✅ Update modal if open
      setViewOrder((prev) =>
        prev && prev._id === orderId
          ? {
              ...prev,
              orderStatus: data.order?.orderStatus || newStatus,
              statusHistory:
                data.order?.statusHistory || prev.statusHistory || [],
            }
          : prev
      );

      setStatusMsg({
        type: "success",
        text: `Updated to "${newStatus}" ✅`,
        orderId,
      });

      setTimeout(() => {
        setStatusMsg({ type: "", text: "", orderId: null });
      }, 3000);
    } catch (err) {
      console.error("Status update error:", err);
      setStatusMsg({
        type: "danger",
        text: err.message || "Failed to update",
        orderId,
      });
      setTimeout(() => {
        setStatusMsg({ type: "", text: "", orderId: null });
      }, 4000);
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // ============================================================
  // CALC ORDER TOTALS
  // ============================================================
  const calcOrderTotals = (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    let totalSales = 0;
    let totalCommission = 0;
    let totalVendorEarning = 0;

    items.forEach((item) => {
      const itemTotal =
        (Number(item.price) || 0) * (item.quantity || 0);
      totalSales += itemTotal;
      totalCommission += Number(item.commission) || 0;
      totalVendorEarning += Number(item.vendorEarning) || 0;
    });

    if (order.commissionSummary) {
      totalCommission =
        order.commissionSummary.totalCommission || totalCommission;
      totalVendorEarning =
        order.commissionSummary.totalVendorEarning || totalVendorEarning;
    }

    return { totalSales, totalCommission, totalVendorEarning };
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <>
        <Header />
        <div className="admin-layout">
          <Sidebar />
          <main className="admin-content mt-5">
            <Container>
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading orders...</p>
              </div>
            </Container>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="admin-layout">
        <Sidebar />
        <main className="admin-content mt-5">
          <Container fluid>
            {error && (
              <Alert variant="danger" onClose={() => setError("")} dismissible>
                {error}
              </Alert>
            )}

            {/* Suspension Alert */}
            {suspensionInfo.isSuspended && (
              <Alert variant="danger" className="mb-4">
                <div className="d-flex align-items-start">
                  <FaBan className="me-3 mt-1" style={{ fontSize: "28px" }} />
                  <div>
                    <h5 className="mb-1">
                      <FaExclamationTriangle className="me-2" />
                      Account Suspended
                    </h5>
                    <p className="mb-1">
                      <strong>Reason:</strong> {suspensionInfo.reason}
                    </p>
                    {suspensionInfo.suspendedAt && (
                      <small className="text-muted d-block">
                        Suspended on:{" "}
                        {formatDate(suspensionInfo.suspendedAt)}
                      </small>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <motion.h4 className="mb-0 d-flex align-items-center">
                Orders
                {suspensionInfo.isSuspended && (
                  <Badge bg="danger" className="ms-2">
                    <FaBan className="me-1" /> Suspended
                  </Badge>
                )}
                {!suspensionInfo.isSuspended && orders.length > 0 && (
                  <Badge bg="secondary" className="ms-2">
                    {orders.length} orders
                  </Badge>
                )}
              </motion.h4>
              {!suspensionInfo.isSuspended && commissionRate > 0 && (
                <Badge bg="info" pill className="p-2">
                  Commission: {commissionRate}% | Plan:{" "}
                  {(plan || "founding").toUpperCase()}
                </Badge>
              )}
            </div>

            <div
              className={`table-responsive ${
                suspensionInfo.isSuspended ? "opacity-50" : ""
              }`}
            >
              <Table bordered hover className="orders-table">
                <thead className="table-dark">
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Commission</th>
                    <th>Your Earnings</th>
                    <th>Status</th>
                    <th>Update Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center text-muted py-4">
                        {suspensionInfo.isSuspended
                          ? "Orders are hidden while account is suspended"
                          : "No orders found"}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const items = Array.isArray(order.items)
                        ? order.items
                        : [];
                      const customerInfo = order.shippingAddress || {};
                      const {
                        totalSales,
                        totalCommission,
                        totalVendorEarning,
                      } = calcOrderTotals(order);
                      const statusMeta = getStatusMeta(order.orderStatus);
                      const isUpdating = updatingStatus[order._id] || false;

                      return (
                        <motion.tr
                          key={order._id}
                          className={
                            suspensionInfo.isSuspended
                              ? "table-secondary"
                              : ""
                          }
                        >
                          <td>
                            <small className="text-muted">
                              #{order._id?.slice(-8) || "N/A"}
                            </small>
                          </td>

                          {/* Date */}
                          <td>
                            <small>{formatDate(order.createdAt)}</small>
                          </td>

                          {/* Customer */}
                          <td>
                            <strong>{customerInfo.name || "N/A"}</strong>
                            <br />
                            <span
                              className="text-muted"
                              style={{ fontSize: "0.8rem" }}
                            >
                              {customerInfo.email || "N/A"}
                            </span>
                            <br />
                            <span
                              className="text-muted"
                              style={{ fontSize: "0.8rem" }}
                            >
                              📞 {customerInfo.phone || "N/A"}
                            </span>
                          </td>

                          {/* Products + variants + custom fields */}
                          <td style={{ maxWidth: "260px" }}>
                            {items.length === 0 ? (
                              <span className="text-muted">
                                No products
                              </span>
                            ) : (
                              items.map((i, idx) => (
                                <div
                                  key={idx}
                                  className="mb-2 pb-2"
                                  style={{
                                    borderBottom:
                                      idx < items.length - 1
                                        ? "1px dashed #ddd"
                                        : "none",
                                  }}
                                >
                                  <div style={{ fontWeight: 600 }}>
                                    {i.productId?.name ||
                                      i.name ||
                                      "Product"}{" "}
                                    × {i.quantity}
                                  </div>

                                  {(i.selectedColor ||
                                    i.selectedSize) && (
                                    <div
                                      style={{
                                        fontSize: "0.75rem",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {i.selectedColor && (
                                        <Badge
                                          bg="dark"
                                          className="me-1"
                                          style={{
                                            fontSize: "0.7rem",
                                          }}
                                        >
                                          🎨 {i.selectedColor}
                                        </Badge>
                                      )}
                                      {i.selectedSize && (
                                        <Badge
                                          bg="secondary"
                                          style={{
                                            fontSize: "0.7rem",
                                          }}
                                        >
                                          📏 {i.selectedSize}
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {i.customFieldLabel &&
                                    i.customFieldValue && (
                                      <div
                                        style={{
                                          fontSize: "0.72rem",
                                          color: "#7a5c00",
                                          background: "#fff9e6",
                                          border: "1px solid #ffd966",
                                          borderRadius: "4px",
                                          padding: "2px 6px",
                                          marginTop: "3px",
                                          display: "inline-block",
                                        }}
                                      >
                                        <strong>
                                          {i.customFieldLabel}:
                                        </strong>{" "}
                                        {i.customFieldValue}
                                      </div>
                                    )}

                                  <small className="text-muted d-block mt-1">
                                    {formatPrice(i.price)}
                                  </small>
                                </div>
                              ))
                            )}
                          </td>

                          {/* Payment */}
                          <td>
                            <Badge bg="light" text="dark">
                              {order.paymentMethod || "COD"}
                            </Badge>
                          </td>

                          {/* Total */}
                          <td>
                            <strong>{formatPrice(totalSales)}</strong>
                          </td>

                          {/* Commission */}
                          <td className="text-warning">
                            {formatPrice(totalCommission)}
                          </td>

                          {/* Vendor Earnings */}
                          <td className="text-success fw-bold">
                            {formatPrice(totalVendorEarning)}
                          </td>

                          {/* Status */}
                          <td>
                            <Badge bg={statusMeta.color}>
                              {statusMeta.icon} {statusMeta.label}
                            </Badge>
                          </td>

                          {/* Update Status Dropdown */}
                          <td>
                            {!suspensionInfo.isSuspended ? (
                              <>
                                <Form.Select
                                  size="sm"
                                  value={order.orderStatus || "Pending"}
                                  onChange={(e) =>
                                    handleStatusUpdate(
                                      order._id,
                                      e.target.value
                                    )
                                  }
                                  disabled={isUpdating}
                                  style={{
                                    minWidth: "140px",
                                    fontSize: "13px",
                                  }}
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </Form.Select>

                                {isUpdating && (
                                  <Spinner
                                    animation="border"
                                    size="sm"
                                    className="mt-1"
                                  />
                                )}

                                {statusMsg.orderId === order._id &&
                                  statusMsg.text && (
                                    <div
                                      className={`small mt-1 text-${statusMsg.type}`}
                                      style={{ fontSize: "11px" }}
                                    >
                                      {statusMsg.text}
                                    </div>
                                  )}
                              </>
                            ) : (
                              <Badge bg="secondary">Locked</Badge>
                            )}
                          </td>

                          {/* View Button */}
                          <td>
                            {!suspensionInfo.isSuspended ? (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => setViewOrder(order)}
                              >
                                <FaEye />
                              </Button>
                            ) : (
                              <Badge bg="secondary">Locked</Badge>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer totals */}
                {orders.length > 0 && !suspensionInfo.isSuspended && (
                  <tfoot>
                    <tr className="table-footer fw-bold">
                      <td colSpan="5" className="text-end">
                        Totals:
                      </td>
                      <td>
                        {formatPrice(
                          orders.reduce(
                            (sum, o) =>
                              sum + calcOrderTotals(o).totalSales,
                            0
                          )
                        )}
                      </td>
                      <td className="text-warning">
                        {formatPrice(
                          orders.reduce(
                            (sum, o) =>
                              sum + calcOrderTotals(o).totalCommission,
                            0
                          )
                        )}
                      </td>
                      <td className="text-success">
                        {formatPrice(
                          orders.reduce(
                            (sum, o) =>
                              sum +
                              calcOrderTotals(o).totalVendorEarning,
                            0
                          )
                        )}
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>

            {!suspensionInfo.isSuspended && orders.length > 0 && (
              <div className="text-muted small">
                Showing {orders.length} orders
                {commissionRate > 0 &&
                  ` | Commission Rate: ${commissionRate}%`}
                {plan && ` | Plan: ${plan.toUpperCase()}`}
              </div>
            )}
          </Container>
        </main>
      </div>

      {/* ===== VIEW ORDER MODAL — ALL INFO ===== */}
      <Modal
        show={!!viewOrder}
        onHide={() => setViewOrder(null)}
        centered
        size="xl"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Order Details — #
            {viewOrder?._id ? viewOrder._id.slice(-8) : "N/A"}
          </Modal.Title>
        </Modal.Header>

        {viewOrder && (
          <Modal.Body>
            {/* Top summary */}
            <Row className="mb-3">
              <Col md={6}>
                <div className="p-3 bg-light rounded">
                  <h6 className="mb-2">📋 Order Info</h6>
                  <p className="mb-1">
                    <strong>Order ID:</strong>{" "}
                    <small>{viewOrder._id}</small>
                  </p>
                  <p className="mb-1">
                    <strong>Date:</strong>{" "}
                    {formatDate(viewOrder.createdAt)}
                  </p>
                  <p className="mb-1">
                    <strong>Payment:</strong>{" "}
                    {viewOrder.paymentMethod || "COD"}
                  </p>
                  <p className="mb-0">
                    <strong>Status:</strong>{" "}
                    <Badge
                      bg={getStatusMeta(viewOrder.orderStatus).color}
                    >
                      {getStatusMeta(viewOrder.orderStatus).icon}{" "}
                      {getStatusMeta(viewOrder.orderStatus).label}
                    </Badge>
                  </p>
                </div>
              </Col>

              <Col md={6}>
                <div className="p-3 bg-light rounded">
                  <h6 className="mb-2">💰 Commission Summary</h6>
                  {viewOrder.commissionSummary ? (
                    <>
                      <p className="mb-1">
                        <strong>Rate:</strong>{" "}
                        {viewOrder.commissionSummary.rate}%
                      </p>
                      <p className="mb-1 text-warning">
                        <strong>Total Commission:</strong>{" "}
                        {formatPrice(
                          viewOrder.commissionSummary.totalCommission
                        )}
                      </p>
                      <p className="mb-0 text-success fw-bold">
                        <strong>Your Earning:</strong>{" "}
                        {formatPrice(
                          viewOrder.commissionSummary.totalVendorEarning
                        )}
                      </p>
                    </>
                  ) : (
                    <small className="text-muted">
                      No commission data
                    </small>
                  )}
                </div>
              </Col>
            </Row>

            {/* Customer + Shipping */}
            <Row className="mb-3">
              <Col md={6}>
                <h6>👤 Customer Information</h6>
                <p className="mb-1">
                  <strong>Name:</strong>{" "}
                  {viewOrder.shippingAddress?.name || "N/A"}
                </p>
                <p className="mb-1">
                  <strong>Email:</strong>{" "}
                  {viewOrder.shippingAddress?.email || "N/A"}
                </p>
                <p className="mb-0">
                  <strong>Phone:</strong>{" "}
                  {viewOrder.shippingAddress?.phone || "N/A"}
                </p>
              </Col>

              <Col md={6}>
                <h6>📦 Shipping Address</h6>
                <p className="mb-1">
                  {viewOrder.shippingAddress?.address || "N/A"}
                </p>
                <p className="mb-1">
                  {viewOrder.shippingAddress?.city || ""},{" "}
                  {viewOrder.shippingAddress?.state || ""} -{" "}
                  {viewOrder.shippingAddress?.pincode || ""}
                </p>
                <p className="mb-0">
                  {viewOrder.shippingAddress?.country || "India"}
                </p>
              </Col>
            </Row>

            <hr />

            {/* Product table */}
            <h6 className="mb-3">🛍️ Products</h6>
            <div className="table-responsive">
              <Table size="sm" bordered>
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Custom Field</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-end">Commission</th>
                    <th className="text-end">Earning</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewOrder.items || []).map((item, idx) => {
                    const itemTotal =
                      (Number(item.price) || 0) *
                      (item.quantity || 0);
                    const comm = Number(item.commission) || 0;
                    const earning =
                      Number(item.vendorEarning) || itemTotal - comm;

                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>
                            {item.productId?.name ||
                              item.name ||
                              "Product"}
                          </strong>
                        </td>
                        <td>
                          {item.selectedColor || item.selectedSize ? (
                            <>
                              {item.selectedColor && (
                                <Badge
                                  bg="dark"
                                  className="me-1"
                                  style={{ fontSize: "0.7rem" }}
                                >
                                  🎨 {item.selectedColor}
                                </Badge>
                              )}
                              {item.selectedSize && (
                                <Badge
                                  bg="secondary"
                                  style={{ fontSize: "0.7rem" }}
                                >
                                  📏 {item.selectedSize}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {item.customFieldLabel &&
                          item.customFieldValue ? (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#7a5c00",
                                background: "#fff9e6",
                                border: "1px solid #ffd966",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                display: "inline-block",
                              }}
                            >
                              <strong>
                                {item.customFieldLabel}:
                              </strong>{" "}
                              {item.customFieldValue}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {item.quantity}
                        </td>
                        <td className="text-end">
                          {formatPrice(item.price)}
                        </td>
                        <td className="text-end">
                          {formatPrice(itemTotal)}
                        </td>
                        <td className="text-end text-warning">
                          {formatPrice(comm)}
                        </td>
                        <td className="text-end text-success fw-bold">
                          {formatPrice(earning)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-light">
                    <td colSpan="6" className="text-end">
                      Totals:
                    </td>
                    <td className="text-end">
                      {formatPrice(
                        (viewOrder.items || []).reduce(
                          (s, i) =>
                            s +
                            (Number(i.price) || 0) *
                              (i.quantity || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="text-end text-warning">
                      {formatPrice(
                        (viewOrder.items || []).reduce(
                          (s, i) => s + (Number(i.commission) || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="text-end text-success">
                      {formatPrice(
                        (viewOrder.items || []).reduce(
                          (s, i) =>
                            s + (Number(i.vendorEarning) || 0),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </div>

            {/* Grand total */}
            <div className="d-flex justify-content-end mt-3">
              <div className="p-3 bg-light rounded text-end">
                <h5 className="mb-1">
                  Grand Total: {formatPrice(viewOrder.totalPrice || 0)}
                </h5>
                {viewOrder.commissionSummary && (
                  <small className="text-muted d-block">
                    Commission:{" "}
                    {formatPrice(
                      viewOrder.commissionSummary.totalCommission
                    )}{" "}
                    | Net:{" "}
                    {formatPrice(
                      viewOrder.commissionSummary.totalVendorEarning
                    )}
                  </small>
                )}
              </div>
            </div>

            <hr />

            {/* Status update + history */}
            {!suspensionInfo.isSuspended && (
              <div className="p-3 border rounded bg-white">
                <h6 className="mb-3">
                  <FaInfoCircle className="me-2" />
                  Update Order Status
                </h6>

                <Row className="align-items-center g-2">
                  <Col md={4}>
                    <Form.Select
                      value={viewOrder.orderStatus || "Pending"}
                      disabled={updatingStatus[viewOrder._id]}
                      onChange={(e) =>
                        handleStatusUpdate(
                          viewOrder._id,
                          e.target.value
                        )
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={8}>
                    {updatingStatus[viewOrder._id] && (
                      <span className="text-muted">
                        <Spinner
                          size="sm"
                          animation="border"
                          className="me-2"
                        />
                        Updating status...
                      </span>
                    )}
                  </Col>
                </Row>

                {Array.isArray(viewOrder.statusHistory) &&
                  viewOrder.statusHistory.length > 0 && (
                    <div className="mt-3">
                      <small className="text-muted fw-bold d-block mb-2">
                        Status History:
                      </small>
                      <ul
                        className="list-unstyled mb-0"
                        style={{ fontSize: "0.8rem" }}
                      >
                        {[...viewOrder.statusHistory]
                          .reverse()
                          .map((h, i) => (
                            <li
                              key={i}
                              className="mb-1 text-muted"
                            >
                              <Badge
                                bg={getStatusMeta(h.status).color}
                                className="me-2"
                                style={{ fontSize: "0.7rem" }}
                              >
                                {h.status}
                              </Badge>
                              {formatDate(h.timestamp)}
                              {h.updatedByName &&
                                ` — by ${h.updatedByName}`}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Final status + total row */}
            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <b>Status:</b>{" "}
                <Badge
                  bg={getStatusMeta(viewOrder.orderStatus).color}
                >
                  {getStatusMeta(viewOrder.orderStatus).label}
                </Badge>
              </div>
              <div className="text-end">
                <h6 className="mb-0">
                  Total: {formatPrice(viewOrder.totalPrice || 0)}
                </h6>
              </div>
            </div>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
};

export default Order;