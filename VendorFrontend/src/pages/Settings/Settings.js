// Settings.js - COMPLETE WITH SUSPENSION HANDLING

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
  Modal,
  Badge,
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
  FaExclamationTriangle,
  FaLock,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaBan
} from "react-icons/fa";
import { MdSettings, MdNotificationsActive } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = process.env.REACT_APP_API_BASE + "/settings";
const AUTH_API_URL = process.env.REACT_APP_API_BASE + "/vendor";

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  // Form state
  const [formData, setFormData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    payoutAccount: "",
  });

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Original settings for tracking changes
  const [originalData, setOriginalData] = useState(null);

  const token = localStorage.getItem("token");

  // ================= CHECK VENDOR STATUS =================
  const checkVendorStatus = async () => {
    try {
      const res = await axios.get(`${AUTH_API_URL}/status`, {
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
      if (err.response?.status === 403) {
        setError("Access denied. Please check your account status.");
      } else {
        setError("Failed to load settings");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    const initialize = async () => {
      const isSuspended = await checkVendorStatus();
      if (!isSuspended) {
        await fetchSettings();
      } else {
        setLoading(false);
      }
    };
    initialize();
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
    if (suspensionInfo.isSuspended) {
      setError("Cannot save settings while account is suspended.");
      return;
    }
    
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
    if (suspensionInfo.isSuspended) {
      setError("Cannot change settings while account is suspended.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ================= CHANGE PASSWORD =================
  const handleChangePassword = async () => {
    if (suspensionInfo.isSuspended) {
      setPasswordError("Cannot change password while account is suspended.");
      return;
    }
    
    // Validate
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      await axios.put(
        `${API_URL}/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPasswordSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);

    } catch (err) {
      console.error("Change password error:", err);
      setPasswordError(err.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // ================= RESET PASSWORD MODAL =================
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleShowPasswordModal = () => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot change password while account is suspended.");
      return;
    }
    setShowPasswordModal(true);
    setPasswordError("");
    setPasswordSuccess("");
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
              <p className="mt-3">Loading settings...</p>
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
                    <small>Settings management is disabled while your account is suspended.</small>
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* HEADER */}
          <motion.div 
            className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h4>
              <MdSettings className="me-2" />
              Vendor Settings
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
            </h4>
            
            <div className="d-flex gap-2 flex-wrap">
              {!suspensionInfo.isSuspended ? (
                <>
                  <Button 
                    variant="outline-warning"
                    onClick={handleShowPasswordModal}
                  >
                    <FaLock className="me-2" />
                    Change Password
                  </Button>
                  {hasChanges && (
                    <Button 
                      variant="outline-secondary" 
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
                </>
              ) : (
                <Button variant="secondary" disabled>
                  <FaBan className="me-1" /> Settings Disabled
                </Button>
              )}
            </div>
          </motion.div>

          {/* Suspended Message */}
          {suspensionInfo.isSuspended && (
            <Alert variant="secondary" className="text-center py-4 mb-4">
              <FaBan style={{ fontSize: '36px', color: '#6c757d' }} />
              <h5 className="mt-2">Settings Restricted</h5>
              <p>Your account has been suspended. You cannot change settings.</p>
              <small>Please contact admin to resolve this issue.</small>
            </Alert>
          )}

          {/* SETTINGS CARDS */}
          <Row>
            {/* Company Info Card */}
            <Col lg={4} className="mb-4">
              <Card className={`h-100 ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
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
              <Card className={`h-100 ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
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
                            disabled={suspensionInfo.isSuspended}
                          >
                            On
                          </ToggleButton>
                          <ToggleButton
                            id="email-off"
                            value={false}
                            variant="outline-danger"
                            size="sm"
                            disabled={suspensionInfo.isSuspended}
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
                            disabled={suspensionInfo.isSuspended}
                          >
                            On
                          </ToggleButton>
                          <ToggleButton
                            id="sms-off"
                            value={false}
                            variant="outline-danger"
                            size="sm"
                            disabled={suspensionInfo.isSuspended}
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
              <Card className={`h-100 ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
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
                        placeholder={suspensionInfo.isSuspended ? "Account locked - Suspended" : "Enter payout account details (e.g., Bank Account / PayPal)"}
                        value={formData.payoutAccount}
                        onChange={(e) => {
                          if (!suspensionInfo.isSuspended) {
                            setFormData({
                              ...formData,
                              payoutAccount: e.target.value
                            });
                          }
                        }}
                        disabled={suspensionInfo.isSuspended}
                      />
                      <Form.Text className="text-muted">
                        {suspensionInfo.isSuspended ? (
                          <span className="text-danger">Account is suspended. Cannot update payout details.</span>
                        ) : (
                          "This account will be used for all payment settlements"
                        )}
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
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                      <small className="text-muted">
                        <strong>Status:</strong> 
                        {suspensionInfo.isSuspended ? (
                          <span className="text-danger ms-2">
                            <FaBan /> Account Suspended
                          </span>
                        ) : hasChanges ? (
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

      {/* ================= CHANGE PASSWORD MODAL ================= */}
      <Modal 
        show={showPasswordModal} 
        onHide={handleClosePasswordModal}
        centered
        size="md"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaLock className="me-2 text-warning" />
            Change Password
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {passwordError && (
            <Alert variant="danger" onClose={() => setPasswordError("")} dismissible>
              {passwordError}
            </Alert>
          )}
          {passwordSuccess && (
            <Alert variant="success">
              {passwordSuccess}
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                <FaKey className="me-2" />
                Current Password
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value
                  })}
                  disabled={passwordLoading}
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-0 text-muted"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ padding: '0.375rem 0.75rem' }}
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                <FaLock className="me-2" />
                New Password
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password (min 6 characters)"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value
                  })}
                  disabled={passwordLoading}
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-0 text-muted"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ padding: '0.375rem 0.75rem' }}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
              <Form.Text className="text-muted">
                Password must be at least 6 characters long
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                <FaCheckCircle className="me-2" />
                Confirm New Password
              </Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value
                  })}
                  disabled={passwordLoading}
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-0 text-muted"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: '0.375rem 0.75rem' }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
              {passwordData.newPassword && passwordData.confirmPassword && 
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <Form.Text className="text-danger">
                    Passwords do not match
                  </Form.Text>
              )}
              {passwordData.newPassword && passwordData.confirmPassword && 
                passwordData.newPassword === passwordData.confirmPassword && (
                  <Form.Text className="text-success">
                    ✓ Passwords match
                  </Form.Text>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClosePasswordModal}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Changing...
              </>
            ) : (
              <>
                <FaLock className="me-2" />
                Change Password
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Settings;