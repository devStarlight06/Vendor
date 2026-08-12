import { useEffect, useState } from "react";
import { Container, Table, Spinner, Alert, Badge } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaBan, FaExclamationTriangle, FaUsers } from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";
import "./customer.css";

const apiUrl = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  // ================= CHECK VENDOR STATUS =================
  const checkVendorStatus = async (token) => {
    try {
      const res = await fetch(`${apiUrl}/vendor/status`, {
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

  /* ---------------- LOAD CUSTOMERS ---------------- */
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login to view customers");
          setLoading(false);
          return;
        }

        // ✅ Check vendor status first
        const isSuspended = await checkVendorStatus(token);
        if (isSuspended) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${apiUrl}/orders/my-customers`, {
          headers: {
            Authorization: `Bearer ${token}`,
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
        setCustomers(data || []);
        setError("");
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(err.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Format spend value
  const formatSpend = (spend) => {
    if (!spend) return "₹0";
    if (typeof spend === 'string' && spend.startsWith('₹')) return spend;
    return `₹${spend}`;
  };

  return (
    <div>
      <Header />

      <div className="admin-layout">
        <Sidebar />

        <main className="admin-content mt-5">
          <Container fluid>
            {/* Error Alert */}
            {error && (
              <Alert variant="danger" onClose={() => setError("")} dismissible>
                {error}
              </Alert>
            )}

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
                      <small>Customer information is not available while your account is suspended.</small>
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            <motion.h4
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 d-flex align-items-center"
            >
              <FaUsers className="me-2" />
              Customers
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
              {!suspensionInfo.isSuspended && customers.length > 0 && (
                <Badge bg="secondary" className="ms-2">
                  {customers.length} customers
                </Badge>
              )}
            </motion.h4>

            {/* Suspended Message */}
            {suspensionInfo.isSuspended && (
              <Alert variant="secondary" className="text-center py-5">
                <FaBan style={{ fontSize: '48px', color: '#6c757d' }} />
                <h5 className="mt-3">Customer Access Restricted</h5>
                <p>Your account has been suspended. You cannot view customer information.</p>
                <small>Please contact admin to resolve this issue.</small>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading customers...</p>
              </div>
            ) : !suspensionInfo.isSuspended ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="table-wrapper"
              >
                <Table responsive bordered hover className="customers-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Total Orders</th>
                      <th>Total Spend</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4">
                          <FaUsers size={30} className="mb-2 d-block mx-auto" />
                          No customers found
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <td>{index + 1}</td>
                          <td className="fw-semibold">{customer.name || "N/A"}</td>
                          <td>{customer.email || "N/A"}</td>
                          <td>{customer.phone || "N/A"}</td>
                          <td>
                            <Badge bg="primary" pill>
                              {customer.orders || 0}
                            </Badge>
                          </td>
                          <td className="fw-bold text-success">
                            {formatSpend(customer.spend)}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </Table>

                {/* Footer Info */}
                {customers.length > 0 && (
                  <div className="text-muted small mt-3">
                    Showing {customers.length} customers
                  </div>
                )}
              </motion.div>
            ) : null}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Customer;