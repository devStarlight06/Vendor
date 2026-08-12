// pages/Order/Order.js - COMPLETE WITH SUSPENSION HANDLING

import { useEffect, useState } from "react";
import { Container, Table, Badge, Button, Modal, Spinner, Alert } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaEye, FaBan, FaExclamationTriangle } from "react-icons/fa";

import "./order.css";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const REACT_APP_API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";
const API = `${REACT_APP_API_BASE}/orders/my-orders`;

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(0);
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');

  // ✅ Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  // Formats price safely
  const formatPrice = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "₹0" : `₹${num.toLocaleString("en-IN")}`;
  };

  // ================= CHECK VENDOR STATUS =================
  const checkVendorStatus = async (token) => {
    try {
      const res = await fetch(`${REACT_APP_API_BASE}/vendor/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.isSuspended) {
          setSuspensionInfo({
            isSuspended: true,
            reason: data.suspensionReason || 'No reason provided',
            suspendedAt: data.suspendedAt
          });
          return true;
        }
        return false;
      }
    } catch (err) {
      console.warn("Status check error:", err.message);
      
      // ✅ Fallback: Check localStorage
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
    }
    return false;
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login to view orders");
          setLoading(false);
          return;
        }

        // ✅ Check vendor status first
        const isSuspended = await checkVendorStatus(token);
        if (isSuspended) {
          setLoading(false);
          return;
        }

        const res = await fetch(API, { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          } 
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
          setPlan(data.plan || 'founding');
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
            {/* Error Alert */}
            {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

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
                      <small>Order information is not available while your account is suspended.</small>
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
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
                  Commission: {commissionRate}% | Plan: {plan.toUpperCase() || 'FOUNDING'}
                </Badge>
              )}
            </div>

            {/* Suspended Message */}
            {suspensionInfo.isSuspended && (
              <Alert variant="secondary" className="text-center py-5 mb-4">
                <FaBan style={{ fontSize: '48px', color: '#6c757d' }} />
                <h5 className="mt-3">Order Access Restricted</h5>
                <p>Your account has been suspended. You cannot view order details.</p>
                <small>Please contact admin to resolve this issue.</small>
              </Alert>
            )}

            <div className={`table-responsive ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
              <Table bordered hover className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total</th>
                    <th>Commission</th>
                    <th>Your Earnings</th>
                    <th>Status</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        {suspensionInfo.isSuspended 
                          ? 'Orders are hidden while account is suspended' 
                          : 'No orders found'}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const items = Array.isArray(order.items) ? order.items : [];
                      const customerInfo = order.shippingAddress || {};

                      let totalSales = 0;
                      let totalCommission = 0;
                      let totalVendorEarning = 0;

                      items.forEach(item => {
                        const itemTotal = (Number(item.price) || 0) * (item.quantity || 0);
                        totalSales += itemTotal;
                        totalCommission += Number(item.commission) || 0;
                        totalVendorEarning += Number(item.vendorEarning) || 0;
                      });

                      if (order.commissionSummary) {
                        totalCommission = order.commissionSummary.totalCommission || totalCommission;
                        totalVendorEarning = order.commissionSummary.totalVendorEarning || totalVendorEarning;
                      }

                      return (
                        <motion.tr key={order._id} className={suspensionInfo.isSuspended ? 'table-secondary' : ''}>
                          <td>
                            <small className="text-muted">{order._id?.slice(-8) || 'N/A'}</small>
                          </td>
                          <td>
                            <strong>{customerInfo.name || "N/A"}</strong>
                            <br />
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                              {customerInfo.email || "N/A"}
                            </span>
                          </td>
                          <td>
                            {items.length === 0 ? (
                              <span className="text-muted">No products</span>
                            ) : (
                              items.map((i, idx) => (
                                <div key={idx} className="mb-1">
                                  {i.productId?.name || i.name || "Product"} × {i.quantity}
                                  <br />
                                  <small className="text-muted">{formatPrice(i.price)}</small>
                                </div>
                              ))
                            )}
                          </td>
                          <td>
                            <strong>{formatPrice(totalSales)}</strong>
                          </td>
                          <td className="text-warning">
                            {formatPrice(totalCommission)}
                          </td>
                          <td className="text-success fw-bold">
                            {formatPrice(totalVendorEarning)}
                          </td>
                          <td>
                            <Badge 
                              bg={order.orderStatus === "Delivered" ? "success" : 
                                  order.orderStatus === "Cancelled" ? "danger" : "warning"}
                            >
                              {order.orderStatus || "Pending"}
                            </Badge>
                          </td>
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
                {orders.length > 0 && !suspensionInfo.isSuspended && (
                  <tfoot>
                    <tr className="table-footer fw-bold">
                      <td colSpan="3" className="text-end">Totals:</td>
                      <td>
                        {formatPrice(orders.reduce((sum, o) => {
                          const items = Array.isArray(o.items) ? o.items : [];
                          return sum + items.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 0), 0);
                        }, 0))}
                      </td>
                      <td className="text-warning">
                        {formatPrice(orders.reduce((sum, o) => {
                          if (o.commissionSummary) {
                            return sum + (o.commissionSummary.totalCommission || 0);
                          }
                          const items = Array.isArray(o.items) ? o.items : [];
                          return sum + items.reduce((s, i) => s + (Number(i.commission) || 0), 0);
                        }, 0))}
                      </td>
                      <td className="text-success">
                        {formatPrice(orders.reduce((sum, o) => {
                          if (o.commissionSummary) {
                            return sum + (o.commissionSummary.totalVendorEarning || 0);
                          }
                          const items = Array.isArray(o.items) ? o.items : [];
                          return sum + items.reduce((s, i) => s + (Number(i.vendorEarning) || 0), 0);
                        }, 0))}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>

            {/* Footer Info */}
            {!suspensionInfo.isSuspended && orders.length > 0 && (
              <div className="text-muted small">
                Showing {orders.length} orders
                {commissionRate > 0 && ` | Commission Rate: ${commissionRate}%`}
                {plan && ` | Plan: ${plan.toUpperCase()}`}
              </div>
            )}
          </Container>
        </main>
      </div>

      {/* ===== VIEW ORDER MODAL ===== */}
      <Modal show={!!viewOrder} onHide={() => setViewOrder(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order Details</Modal.Title>
        </Modal.Header>
        {viewOrder && (
          <Modal.Body>
            <p><b>Order ID:</b> {viewOrder._id}</p>
            <hr />

            {/* Commission Summary */}
            {viewOrder.commissionSummary && (
              <div className="mb-3 p-2 bg-light rounded">
                <h6>Commission Summary</h6>
                <div className="row">
                  <div className="col-4">
                    <small>Rate: {viewOrder.commissionSummary.rate}%</small>
                  </div>
                  <div className="col-4">
                    <small>Total Commission: {formatPrice(viewOrder.commissionSummary.totalCommission)}</small>
                  </div>
                  <div className="col-4">
                    <small>Your Earning: {formatPrice(viewOrder.commissionSummary.totalVendorEarning)}</small>
                  </div>
                </div>
              </div>
            )}

            <div className="row">
              <div className="col-md-6 border-end">
                <h6>Customer Information</h6>
                <p>
                  <b>Name:</b> {viewOrder.shippingAddress?.name || "No Name Provided"}<br />
                  <b>Email:</b> {viewOrder.shippingAddress?.email || "No Email Provided"}<br />
                  <b>Phone:</b> {viewOrder.shippingAddress?.phone || "No Phone Provided"}
                </p>
              </div>
              <div className="col-md-6 ps-md-4">
                <h6>Shipping Address</h6>
                <p>
                  {viewOrder.shippingAddress?.address || "N/A"}<br />
                  {viewOrder.shippingAddress?.city}, {viewOrder.shippingAddress?.state} - {viewOrder.shippingAddress?.pincode}<br />
                  {viewOrder.shippingAddress?.country}
                </p>
              </div>
            </div>
            <hr />

            <h6>Products</h6>
            <ul className="list-unstyled">
              {viewOrder.items.map((item, idx) => {
                const itemTotal = (Number(item.price) || 0) * (item.quantity || 0);
                const comm = item.commission || 0;
                const earning = item.vendorEarning || (itemTotal - comm);
                return (
                  <li key={idx} className="mb-2 border-bottom pb-2">
                    <div className="d-flex justify-content-between">
                      <span>
                        <strong>{item.productId?.name || item.name || "Product"}</strong> × {item.quantity}
                      </span>
                      <span>{formatPrice(itemTotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between text-muted small">
                      <span>Commission: {formatPrice(comm)}</span>
                      <span>Your Earning: {formatPrice(earning)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <b>Status:</b> <Badge bg={viewOrder.orderStatus === "Delivered" ? "success" : "warning"}>
                  {viewOrder.orderStatus || "Pending"}
                </Badge>
              </div>
              <div className="text-end">
                <h6 className="mb-0">
                  Total: {formatPrice(viewOrder.totalPrice || 0)}
                </h6>
                {viewOrder.commissionSummary && (
                  <small className="text-muted">
                    Commission: {formatPrice(viewOrder.commissionSummary.totalCommission)} | 
                    Net: {formatPrice(viewOrder.commissionSummary.totalVendorEarning)}
                  </small>
                )}
              </div>
            </div>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
};

export default Order;