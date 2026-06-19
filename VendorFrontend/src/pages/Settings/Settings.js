import { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Button,
  Spinner,
  Alert,
  Card,
  Row,
  Col,
  Form,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { 
  FaSave, 
  FaUndo, 
  FaEnvelope, 
  FaSms,
  FaUniversity,
  FaUserCog,
  FaBuilding,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { MdSettings, MdNotificationsActive } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

// const API_URL = "http://localhost:5001/api/settings";
const API_URL = process.env.REACT_APP_API_BASE + "/settings";

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    payoutAccount: "",
  });

  // Original settings for tracking changes
  const [originalData, setOriginalData] = useState(null);

  const token = localStorage.getItem("token");

  // ================= FETCH SETTINGS =================
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = res.data.settings;
      setSettings(data);
      
      const form = {
        emailNotifications: data.emailNotifications ?? true,
        smsNotifications: data.smsNotifications ?? false,
        payoutAccount: data.payoutAccount || "",
      };
      
      setFormData(form);
      setOriginalData(form);
      setError("");
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ================= TRACK CHANGES =================
  useEffect(() => {
    if (originalData) {
      const changed = 
        formData.emailNotifications !== originalData.emailNotifications ||
        formData.smsNotifications !== originalData.smsNotifications ||
        formData.payoutAccount !== originalData.payoutAccount;
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= UPDATE SETTINGS =================
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError("");
      
      const payload = {
        emailNotifications: formData.emailNotifications,
        smsNotifications: formData.smsNotifications,
        payoutAccount: formData.payoutAccount,
      };

      const res = await axios.put(API_URL, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const updatedData = res.data.settings;
      setSettings(updatedData);
      
      const form = {
        emailNotifications: updatedData.emailNotifications ?? true,
        smsNotifications: updatedData.smsNotifications ?? false,
        payoutAccount: updatedData.payoutAccount || "",
      };
      
      setFormData(form);
      setOriginalData(form);
      setHasChanges(false);
      setSuccess("Settings updated successfully!");
    } catch (err) {
      console.error("Update settings error:", err);
      setError(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  // ================= RESET FORM =================
  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      setHasChanges(false);
      setError("");
    }
  };

  // ================= HANDLE TOGGLE CHANGE =================
  const handleToggleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Loading settings...
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

          {/* HEADER */}
          <motion.div 
            className="d-flex justify-content-between align-items-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h4>
              <MdSettings className="me-2" />
              Vendor Settings
            </h4>
            
            <div>
              {hasChanges && (
                <Button 
                  variant="outline-secondary" 
                  className="me-2"
                  onClick={handleReset}
                  disabled={saving}
                >
                  <FaUndo /> Reset
                </Button>
              )}
              <Button 
                variant="primary"
                onClick={handleSaveSettings}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Settings
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* SETTINGS CARDS */}
          <Row>
            {/* Company Info Card */}
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Header className="bg-success text-white">
                  <FaBuilding className="me-2" />
                  Company Information
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <label className="text-muted small fw-bold">Company Name</label>
                    <p className="h5">{settings?.company || "N/A"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="text-muted small fw-bold">Vendor ID</label>
                    <p className="h6 text-muted">{settings?.vendorId || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-muted small fw-bold">Last Updated</label>
                    <p className="text-muted">
                      {settings?.updatedAt 
                        ? new Date(settings.updatedAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div className="mt-3 p-2 bg-light rounded">
                    <small className="text-muted">
                      <FaCheckCircle className="text-success me-1" />
                      Settings are automatically saved to your account
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Notification Settings Card */}
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Header className="bg-success text-white">
                  <MdNotificationsActive className="me-2" />
                  Notification Preferences
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <Form.Label className="fw-bold mb-0">
                            <FaEnvelope className="me-2 text-primary" />
                            Email Notifications
                          </Form.Label>
                          <p className="text-muted small">Receive updates via email</p>
                        </div>
                        <ToggleButtonGroup
                          type="radio"
                          name="emailNotifications"
                          value={formData.emailNotifications}
                          onChange={(val) => handleToggleChange("emailNotifications", val)}
                        >
                          <ToggleButton
                            id="email-on"
                            value={true}
                            variant="outline-success"
                            size="sm"
                          >
                            On
                          </ToggleButton>
                          <ToggleButton
                            id="email-off"
                            value={false}
                            variant="outline-danger"
                            size="sm"
                          >
                            Off
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <Form.Label className="fw-bold mb-0">
                            <FaSms className="me-2 text-warning" />
                            SMS Notifications
                          </Form.Label>
                          <p className="text-muted small">Receive updates via SMS</p>
                        </div>
                        <ToggleButtonGroup
                          type="radio"
                          name="smsNotifications"
                          value={formData.smsNotifications}
                          onChange={(val) => handleToggleChange("smsNotifications", val)}
                        >
                          <ToggleButton
                            id="sms-on"
                            value={true}
                            variant="outline-success"
                            size="sm"
                          >
                            On
                          </ToggleButton>
                          <ToggleButton
                            id="sms-off"
                            value={false}
                            variant="outline-danger"
                            size="sm"
                          >
                            Off
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </div>
                    </Form.Group>

                    <div className="mt-3 p-2 bg-light rounded">
                      <small className="text-muted">
                        <FaExclamationTriangle className="text-warning me-1" />
                        SMS notifications require additional configuration
                      </small>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            {/* Payment Settings Card */}
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Header className="bg-success text-white">
                  <FaUniversity className="me-2" />
                  Payment & Payout
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">
                        <FaUserCog className="me-2" />
                        Payout Account
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter payout account details (e.g., Bank Account / PayPal)"
                        value={formData.payoutAccount}
                        onChange={(e) => setFormData({
                          ...formData,
                          payoutAccount: e.target.value
                        })}
                      />
                      <Form.Text className="text-muted">
                        This account will be used for all payment settlements
                      </Form.Text>
                    </Form.Group>

                    <div className="p-2 bg-light rounded">
                      <small className="text-muted">
                        <FaCheckCircle className="text-success me-1" />
                        All payment details are encrypted and secure
                      </small>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Status Bar */}
          <Row>
            <Col>
              <Card className="mt-2">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">
                        <strong>Status:</strong> 
                        {hasChanges ? (
                          <span className="text-warning ms-2">
                            <FaExclamationTriangle /> Unsaved changes
                          </span>
                        ) : (
                          <span className="text-success ms-2">
                            <FaCheckCircle /> All saved
                          </span>
                        )}
                      </small>
                    </div>
                    <div>
                      <small className="text-muted">
                        Last saved: {settings?.updatedAt 
                          ? new Date(settings.updatedAt).toLocaleString()
                          : "Never"}
                      </small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </main>
    </>
  );
};

export default Settings;