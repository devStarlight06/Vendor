// Notification.js - COMPLETE WITH SUSPENSION HANDLING

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
  FaClock,
  FaBan,
  FaExclamationTriangle
} from "react-icons/fa";
import { MdNotificationsActive, MdNotificationsOff } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = process.env.REACT_APP_API_BASE 
  ? process.env.REACT_APP_API_BASE + "/notifications"
  : "https://api.brandelvendor.starlighttechlabsindia.com/api/notifications";

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDetail, setShowDetail] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // ✅ Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  const token = localStorage.getItem("token");

  // ================= CHECK VENDOR STATUS =================
  const checkVendorStatus = async () => {
    try {
      // ✅ Try /auth/status first (vendor route)
      const res = await axios.get(`${API_URL.replace('/notifications', '')}/vendor/status`, {
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
      
      return false;
    }
  };

  // ================= FETCH NOTIFICATIONS =================
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log("Fetching notifications from:", API_URL);
      
      const res = await axios.get(API_URL, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      console.log("Notifications response:", res.data);
      setNotifications(res.data.notifications || []);
      setError("");
    } catch (err) {
      console.error("Error fetching notifications:", err);
      console.error("Error response:", err.response?.data);
      
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Please check your account status.");
      } else if (err.response?.status === 404) {
        setError("Notification API not found. Please check server configuration.");
      } else {
        setError(err.response?.data?.message || "Failed to fetch notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (!token) {
        setError("Please login to view notifications");
        setLoading(false);
        return;
      }

      const isSuspended = await checkVendorStatus();
      if (!isSuspended) {
        await fetchNotifications();
      } else {
        setLoading(false);
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

  // ================= MARK AS READ =================
  const handleMarkAsRead = async (id) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot mark notifications while account is suspended.");
      return;
    }
    
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
      setError(err.response?.data?.message || "Failed to mark as read");
    }
  };

  // ================= MARK ALL AS READ =================
  const handleMarkAllAsRead = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot mark notifications while account is suspended.");
      return;
    }
    
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n._id);
      
      if (unreadIds.length === 0) {
        setError("No unread notifications");
        return;
      }

      try {
        await axios.put(`${API_URL}/read-all`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setSuccess("All notifications marked as read!");
      } catch (err) {
        await Promise.all(
          unreadIds.map(id => 
            axios.put(`${API_URL}/${id}/read`, {}, {
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        );
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setSuccess("All notifications marked as read!");
      }
    } catch (err) {
      console.error("Mark all as read error:", err);
      setError(err.response?.data?.message || "Failed to mark all as read");
    }
  };

  // ================= DELETE NOTIFICATION =================
  const handleDelete = async (id) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot delete notifications while account is suspended.");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.filter((n) => n._id !== id));
      setSuccess("Notification deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  // ================= DELETE ALL =================
  const handleDeleteAll = async () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot delete notifications while account is suspended.");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete all notifications?")) return;
    
    try {
      try {
        await axios.delete(`${API_URL}/delete-all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications([]);
        setSuccess("All notifications deleted!");
      } catch (err) {
        await Promise.all(
          notifications.map(n => 
            axios.delete(`${API_URL}/${n._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        );
        setNotifications([]);
        setSuccess("All notifications deleted!");
      }
    } catch (err) {
      console.error("Delete all error:", err);
      setError(err.response?.data?.message || "Failed to delete all notifications");
    }
  };

  // ================= VIEW DETAIL =================
  const handleViewDetail = (notification) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot view notifications while account is suspended.");
      return;
    }
    
    setSelectedNotification(notification);
    setShowDetail(true);
    
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

  // ================= GET TYPE BADGE =================
  const getTypeBadge = (type) => {
    switch(type) {
      case 'success': return <Badge bg="success">Success</Badge>;
      case 'warning': return <Badge bg="warning">Warning</Badge>;
      case 'danger': return <Badge bg="danger">Danger</Badge>;
      default: return <Badge bg="info">Info</Badge>;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <Sidebar />
        <main className="admin-content mt-5">
          <Container>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading notifications...</p>
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
                    <small>Notification management is disabled while your account is suspended.</small>
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* STATS CARDS */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <FaBell size={30} className="text-primary mb-2" />
                  <h5>Total Notifications</h5>
                  <h3>{stats.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <MdNotificationsActive size={30} className="text-danger mb-2" />
                  <h5>Unread</h5>
                  <h3>{stats.unread}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className={`text-center shadow-sm ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <MdNotificationsOff size={30} className="text-success mb-2" />
                  <h5>Read</h5>
                  <h3>{stats.read}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Notifications
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
              {!suspensionInfo.isSuspended && stats.unread > 0 && (
                <Badge bg="danger" className="ms-2">{stats.unread} unread</Badge>
              )}
            </motion.h4>

            <div>
              {!suspensionInfo.isSuspended ? (
                <>
                  {stats.unread > 0 && (
                    <Button 
                      variant="outline-primary" 
                      className="me-2 mb-2 mb-sm-0"
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
                </>
              ) : (
                <Button variant="secondary" disabled>
                  <FaBan className="me-1" /> Management Disabled
                </Button>
              )}
            </div>
          </div>

          {/* Suspended Message */}
          {suspensionInfo.isSuspended && (
            <Alert variant="secondary" className="text-center py-4 mb-3">
              <FaBan style={{ fontSize: '36px', color: '#6c757d' }} />
              <h5 className="mt-2">Notifications Restricted</h5>
              <p>Your account has been suspended. You cannot manage notifications.</p>
              <small>Please contact admin to resolve this issue.</small>
            </Alert>
          )}

          {/* TABLE */}
          <Table responsive bordered hover className={suspensionInfo.isSuspended ? 'opacity-50' : ''}>
            <thead className="table-light">
              <tr>
                <th style={{ width: "5%" }}>Status</th>
                <th style={{ width: "10%" }}>Type</th>
                <th style={{ width: "18%" }}>Title</th>
                <th>Message</th>
                <th style={{ width: "15%" }}>Received</th>
                <th style={{ width: "15%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <FaBell size={50} className="text-muted mb-3" />
                    <p className="text-muted">
                      {suspensionInfo.isSuspended 
                        ? 'Notifications are hidden while account is suspended' 
                        : 'No notifications found'}
                    </p>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr 
                    key={notification._id}
                    className={!notification.read && !suspensionInfo.isSuspended ? "table-active" : ""}
                  >
                    <td className="text-center">
                      {!notification.read && !suspensionInfo.isSuspended ? (
                        <Badge bg="danger" pill>
                          <FaBell />
                        </Badge>
                      ) : (
                        <Badge bg="secondary" pill>
                          <FaEnvelopeOpen />
                        </Badge>
                      )}
                    </td>
                    <td>{getTypeBadge(notification.type)}</td>
                    <td>
                      <strong>{notification.title || "No Title"}</strong>
                    </td>
                    <td>
                      {notification.message && notification.message.length > 100 ? (
                        <>
                          {notification.message.substring(0, 100)}...
                          {!suspensionInfo.isSuspended && (
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 ms-1"
                              onClick={() => handleViewDetail(notification)}
                            >
                              Read more
                            </Button>
                          )}
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
                      {!suspensionInfo.isSuspended ? (
                        <>
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

          {/* Footer Info */}
          {!suspensionInfo.isSuspended && (
            <div className="text-muted small">
              Showing {notifications.length} notifications
              {stats.unread > 0 && ` | ${stats.unread} unread`}
            </div>
          )}
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
              {getTypeBadge(selectedNotification.type)}
              <Badge bg={selectedNotification.read ? "success" : "danger"} className="ms-2">
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

            {selectedNotification.link && (
              <div className="mt-3">
                <small className="text-muted">
                  <a href={selectedNotification.link}>View related item</a>
                </small>
              </div>
            )}

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
          {selectedNotification && !selectedNotification.read && !suspensionInfo.isSuspended && (
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