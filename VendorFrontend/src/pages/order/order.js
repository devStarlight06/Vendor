import { useEffect, useState } from "react";
import { Container, Table, Badge, Button, Modal, Spinner } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaEye } from "react-icons/fa";

import "./order.css";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API = "http://localhost:5001/api/orders/my-orders";

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Formats price safely and handles potential non-number values
  const formatPrice = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "₹0" : `₹${num.toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <>
      <Header />
      <div className="admin-layout">
        <Sidebar />
        <main className="admin-content mt-5">
          <Container fluid>
            <motion.h4 className="mb-4">Orders</motion.h4>
            <Table responsive bordered hover className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Products</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">No orders found</td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const items = Array.isArray(order.items) ? order.items : [];

                    // FIXED: Use shippingAddress as the source for Customer info
                    const customerInfo = order.shippingAddress || {};

                    // FIXED: Calculate total based on vendor-specific items
                    const vendorTotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 0), 0);

                    return (
                      <motion.tr key={order._id}>
                        <td><small>{order._id}</small></td>
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
                        <td><strong>{formatPrice(vendorTotal)}</strong></td>
                        <td>
                          <Badge bg={order.orderStatus === "Delivered" ? "success" : order.orderStatus === "Cancelled" ? "danger" : "warning"}>
                            {order.orderStatus}
                          </Badge>
                        </td>
                        <td>
                          <Button size="sm" variant="outline-primary" onClick={() => setViewOrder(order)}>
                            <FaEye />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </Table>
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
            <div className="row">
          
              <div className="col-md-6 border-end">
                <h6>Customer Information</h6>
                <p>
                  {/* Use optional chaining and default strings */}
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
              {viewOrder.items.map((item, idx) => (
                <li key={idx} className="mb-2">
                  • {item.productId?.name || item.name} × {item.quantity} — <strong>{formatPrice(item.price)}</strong>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
              <div>
                <b>Status:</b> <Badge bg={viewOrder.orderStatus === "Delivered" ? "success" : "warning"}>{viewOrder.orderStatus}</Badge>
              </div>
              <div className="text-end">
                <h5 className="mb-0">
                  Vendor Total: {formatPrice(viewOrder.items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 0), 0))}
                </h5>
              </div>
            </div>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
};

export default Order;