import { useEffect, useState } from "react";
import { Container, Card, Spinner, Row, Col, Badge, Alert } from "react-bootstrap";
import { FaBan, FaExclamationTriangle, FaFolderOpen } from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";
const AUTH_API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const VendorCategories = () => {
  const [categories, setCategories] = useState([]);
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
      const res = await fetch(`${AUTH_API_BASE}/vendor/status`, {
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
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login to view categories");
          setLoading(false);
          return;
        }

        // ✅ Check vendor status first
        const isSuspended = await checkVendorStatus(token);
        if (isSuspended) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/products/my-categories`, {
          headers: { Authorization: `Bearer ${token}` },
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
        setCategories(data || []);
        setError("");
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <div className="admin-layout mt-5">
          <Sidebar />
          <main className="admin-content">
            <Container fluid>
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading categories...</p>
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
      <div className="admin-layout mt-5">
        <Sidebar />
        <main className="admin-content">
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
                      <small>Categories are not available while your account is suspended.</small>
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="mb-0 d-flex align-items-center">
                <FaFolderOpen className="me-2" />
                My Categories
                {suspensionInfo.isSuspended && (
                  <Badge bg="danger" className="ms-2">
                    <FaBan className="me-1" /> Suspended
                  </Badge>
                )}
                {!suspensionInfo.isSuspended && categories.length > 0 && (
                  <Badge bg="secondary" className="ms-2">
                    {categories.length} categories
                  </Badge>
                )}
              </h4>
            </div>

            {/* Suspended Message */}
            {suspensionInfo.isSuspended && (
              <Alert variant="secondary" className="text-center py-5">
                <FaBan style={{ fontSize: '48px', color: '#6c757d' }} />
                <h5 className="mt-3">Categories Access Restricted</h5>
                <p>Your account has been suspended. You cannot view categories.</p>
                <small>Please contact admin to resolve this issue.</small>
              </Alert>
            )}

            {/* Categories Grid */}
            {!suspensionInfo.isSuspended && (
              <>
                {categories.length === 0 ? (
                  <Card className="p-4 text-center text-muted">
                    <FaFolderOpen size={40} className="mx-auto mb-3 text-muted" />
                    <p>No categories found</p>
                    <small>Categories will appear here once you add products with categories.</small>
                  </Card>
                ) : (
                  <Row>
                    {categories.map((cat, i) => (
                      <Col md={4} lg={3} key={i} className="mb-4">
                        <Card className="h-100 shadow-sm border-0 hover-shadow">
                          <Card.Body className="d-flex align-items-center justify-content-between">
                            <span className="fw-semibold">
                              <FaFolderOpen className="me-2 text-primary" />
                              {cat}
                            </span>
                            <Badge bg="primary" pill>
                              Category
                            </Badge>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}

                {/* Footer Info */}
                {categories.length > 0 && (
                  <div className="text-muted small mt-3">
                    Showing {categories.length} categories
                  </div>
                )}
              </>
            )}
          </Container>
        </main>
      </div>
    </>
  );
};

export default VendorCategories;