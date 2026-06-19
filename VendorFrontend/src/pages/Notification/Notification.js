import { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Table,
  Button,
  Modal,
  Spinner,
  Alert,
  Badge,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { 
  FaBell, 
  FaCheckDouble, 
  FaTrash, 
  FaEye,
  FaEnvelope,
  FaEnvelopeOpen,
  FaClock
} from "react-icons/fa";
import { MdNotificationsActive, MdNotificationsOff } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = process.env.REACT_APP_API_BASE + "/notifications";

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDetail, setShowDetail] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const token = localStorage.getItem("token");

  // ================= FETCH NOTIFICATIONS =================
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.notifications || []);
      setError("");
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= MARK AS READ =================
  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`${API_URL}/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setNotifications(notifications.map(notif => 
        notif._id === id ? { ...notif, read: true } : notif
      ));
      setSuccess("Notification marked as read!");
    } catch (err) {
      console.error("Mark as read error:", err);
      setError("Failed to mark as read");
    }
  };

  // ================= MARK ALL AS READ =================
  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n._id);
      
      if (unreadIds.length === 0) {
        setError("No unread notifications");
        return;
      }

      await Promise.all(
        unreadIds.map(id => 
          axios.put(`${API_URL}/${id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setSuccess("All notifications marked as read!");
    } catch (err) {
      console.error("Mark all as read error:", err);
      setError("Failed to mark all as read");
    }
  };

  // ================= DELETE NOTIFICATION =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.filter((n) => n._id !== id));
      setSuccess("Notification deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  // ================= DELETE ALL =================
  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) return;
    
    try {
      await Promise.all(
        notifications.map(n => 
          axios.delete(`${API_URL}/${n._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setNotifications([]);
      setSuccess("All notifications deleted!");
    } catch (err) {
      console.error("Delete all error:", err);
      setError("Failed to delete all notifications");
    }
  };

  // ================= VIEW DETAIL =================
  const handleViewDetail = (notification) => {
    setSelectedNotification(notification);
    setShowDetail(true);
    
    // Auto mark as read when viewed
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
  };

  // ================= STATS =================
  const getStats = () => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const read = notifications.filter(n => n.read).length;
    return { total, unread, read };
  };

  const stats = getStats();

  // ================= FORMAT TIME =================
  const formatTime = (date) => {
    if (!date) return "N/A";
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Loading notifications...
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
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <FaBell size={30} className="text-primary mb-2" />
                  <h5>Total Notifications</h5>
                  <h3>{stats.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <MdNotificationsActive size={30} className="text-danger mb-2" />
                  <h5>Unread</h5>
                  <h3>{stats.unread}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <MdNotificationsOff size={30} className="text-success mb-2" />
                  <h5>Read</h5>
                  <h3>{stats.read}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Notifications
              {stats.unread > 0 && (
                <Badge bg="danger" className="ms-2">{stats.unread} unread</Badge>
              )}
            </motion.h4>

            <div>
              {stats.unread > 0 && (
                <Button 
                  variant="outline-primary" 
                  className="me-2"
                  onClick={handleMarkAllAsRead}
                >
                  <FaCheckDouble /> Mark All as Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button 
                  variant="outline-danger"
                  onClick={handleDeleteAll}
                >
                  <FaTrash /> Delete All
                </Button>
              )}
            </div>
          </div>

          {/* TABLE */}
          <Table responsive bordered hover>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>Status</th>
                <th style={{ width: "20%" }}>Title</th>
                <th>Message</th>
                <th style={{ width: "15%" }}>Received</th>
                <th style={{ width: "15%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    <FaBell size={50} className="text-muted mb-3" />
                    <p className="text-muted">No notifications found</p>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr 
                    key={notification._id}
                    className={!notification.read ? "table-active" : ""}
                  >
                    <td className="text-center">
                      {!notification.read ? (
                        <Badge bg="danger" pill>
                          <FaBell />
                        </Badge>
                      ) : (
                        <Badge bg="secondary" pill>
                          <FaEnvelopeOpen />
                        </Badge>
                      )}
                    </td>
                    <td>
                      <strong>{notification.title || "No Title"}</strong>
                    </td>
                    <td>
                      {notification.message && notification.message.length > 100 ? (
                        <>
                          {notification.message.substring(0, 100)}...
                          <Button
                            size="sm"
                            variant="link"
                            className="p-0 ms-1"
                            onClick={() => handleViewDetail(notification)}
                          >
                            Read more
                          </Button>
                        </>
                      ) : (
                        notification.message || "No message"
                      )}
                    </td>
                    <td>
                      <small className="text-muted">
                        <FaClock className="me-1" />
                        {formatTime(notification.createdAt)}
                      </small>
                    </td>
                    <td>
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="outline-success"
                          className="me-1"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title="Mark as read"
                        >
                          <FaCheckDouble />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline-info"
                        className="me-1"
                        onClick={() => handleViewDetail(notification)}
                        title="View details"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(notification._id)}
                        title="Delete"
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

      {/* ================= NOTIFICATION DETAIL MODAL ================= */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBell className="me-2" />
            {selectedNotification?.title || "Notification Details"}
          </Modal.Title>
        </Modal.Header>

        {selectedNotification && (
          <Modal.Body>
            <div className="mb-3">
              <Badge bg={selectedNotification.read ? "success" : "danger"}>
                {selectedNotification.read ? "Read" : "Unread"}
              </Badge>
              <span className="ms-3 text-muted">
                <FaClock className="me-1" />
                {selectedNotification.createdAt 
                  ? new Date(selectedNotification.createdAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
            
            <div className="p-3 bg-light rounded">
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {selectedNotification.message || "No message content"}
              </p>
            </div>

            <div className="mt-3">
              <small className="text-muted">
                Company: {selectedNotification.company || "N/A"}
              </small>
            </div>
          </Modal.Body>
        )}

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetail(false)}>
            Close
          </Button>
          {selectedNotification && !selectedNotification.read && (
            <Button 
              variant="primary" 
              onClick={() => {
                handleMarkAsRead(selectedNotification._id);
                setShowDetail(false);
              }}
            >
              <FaCheckDouble /> Mark as Read
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Notification;