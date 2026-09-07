// Settings.js - Logo management with sync and proper URL handling
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
  Image,
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
  FaBan,
  FaUpload,
  FaTrash,
  FaImage,
  FaSync
} from "react-icons/fa";
import { MdSettings, MdNotificationsActive } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

// ✅ API URLs
const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5177';
// const ADMIN_BASE_URL = 'http://localhost:7001';
const ADMIN_BASE_URL = 'https://api-admin.native91.com';
const API_URL = `${API_BASE_URL}/settings`;
const AUTH_API_URL = `${API_BASE_URL}/vendor`;

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

  // Logo state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [logoSource, setLogoSource] = useState('none'); // 'admin' or 'vendor' or 'none'

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

  // ✅ FIXED: IMAGE NORMALIZATION FUNCTION
  const normalizeImage = (image) => {
    if (!image) return null;

    // Already full URL
    if (image.startsWith("http://") || image.startsWith("https://")) {
      // ✅ If admin image accidentally comes with vendor URL, correct it
      if (image.includes("/images/company/")) {
        const pathPart = image.substring(image.indexOf("/images"));
        return `${ADMIN_BASE_URL}${pathPart}`;
      }
      return image;
    }

    // ✅ Admin logo (starts with /images)
    if (image.startsWith("/images")) {
      return `${ADMIN_BASE_URL}${image}`;
    }

    // ✅ Vendor logo (starts with /uploads)
    if (image.startsWith("/uploads")) {
      return `${API_BASE_URL}${image}`;
    }

    // Filename only
    if (!image.includes("/") && !image.includes("\\")) {
      return `${API_BASE_URL}/uploads/logos/${image}`;
    }

    // Relative path
    return `${API_BASE_URL}/${image.replace(/^\/+/, "")}`;
  };

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
      
      // ✅ Use logoPath (NOT logo) for normalization
      if (data.logoPath) {
        const normalizedLogo = normalizeImage(data.logoPath);
        console.log("✅ Logo Source:", data.logoSource);
        console.log("✅ Logo Path:", data.logoPath);
        console.log("✅ Logo URL:", normalizedLogo);
        
        setLogoUrl(normalizedLogo);
        setLogoSource(data.logoSource || 'none');
        setLogoLoadError(false);
      } else {
        console.log('ℹ️ No logo found');
        setLogoUrl(null);
        setLogoSource('none');
        setLogoLoadError(false);
      }
      
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

  // ================= CLEANUP LOGO PREVIEW =================
  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
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

  // ================= LOGO HANDLERS =================
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo file size must be less than 5MB");
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, WebP, and SVG files are allowed");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError("");
    setLogoLoadError(false);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      setError("Please select a logo file first");
      return;
    }

    if (suspensionInfo.isSuspended) {
      setError("Cannot upload logo while account is suspended.");
      return;
    }

    try {
      setUploadingLogo(true);
      setError("");

      const formData = new FormData();
      formData.append('logo', logoFile);

      const res = await axios.post(`${API_URL}/logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        // Use the full URL from response
        const fullLogoUrl = res.data.logoUrl || `${API_BASE_URL}${res.data.logoPath}`;
        setLogoUrl(fullLogoUrl);
        setLogoSource('vendor');
        setLogoFile(null);
        setLogoPreview(null);
        setLogoLoadError(false);
        setSuccess("✅ Vendor logo uploaded successfully!");
        
        // Refresh settings to get updated data
        await fetchSettings();
      }
    } catch (err) {
      console.error("Logo upload error:", err);
      setError(err.response?.data?.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) {
      setError("No logo to delete");
      return;
    }

    if (suspensionInfo.isSuspended) {
      setError("Cannot delete logo while account is suspended.");
      return;
    }

    // ✅ Only allow deleting vendor logo
    if (logoSource === 'admin') {
      setError("Admin logo cannot be deleted from here. Please contact Admin.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete your vendor logo?")) {
      return;
    }

    try {
      setUploadingLogo(true);
      setError("");

      const res = await axios.delete(`${API_URL}/logo`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setLogoUrl(null);
        setLogoFile(null);
        setLogoPreview(null);
        setLogoLoadError(false);
        setLogoSource('none');
        setSuccess("✅ Vendor logo deleted successfully!");
        
        // Refresh settings
        await fetchSettings();
      }
    } catch (err) {
      console.error("Logo delete error:", err);
      setError(err.response?.data?.message || "Failed to delete logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const cancelLogoUpload = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setError("");
    setLogoLoadError(false);
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

          {/* SETTINGS CARDS */}
          <Row>
            {/* Company Info Card - With Logo */}
            <Col lg={4} className="mb-4">
              <Card className={`h-100 ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
                  <span>
                    <FaBuilding className="me-2" />
                    Company Information
                  </span>
                  {logoUrl && !logoLoadError && (
                    <Badge bg="light" text="dark" className="d-flex align-items-center gap-1">
                      <FaCheckCircle className="text-success" /> 
                      {logoSource === 'admin' ? 'Admin Logo' : 'Vendor Logo'}
                    </Badge>
                  )}
                </Card.Header>
                <Card.Body>
                  {/* Logo Section */}
                  <div className="text-center mb-3">
                    <div className="position-relative d-inline-block">
                      {logoPreview ? (
                        <Image 
                          src={logoPreview} 
                          alt="Logo Preview" 
                          fluid 
                          style={{ 
                            maxHeight: '120px', 
                            maxWidth: '200px',
                            objectFit: 'contain',
                            border: '2px solid #28a745',
                            borderRadius: '8px',
                            padding: '4px'
                          }}
                        />
                      ) : logoUrl && !logoLoadError ? (
                        <img
                          src={logoUrl}
                          alt="Company Logo"
                          style={{ 
                            maxHeight: '120px', 
                            maxWidth: '200px',
                            objectFit: 'contain',
                            border: '2px solid #28a745',
                            borderRadius: '8px',
                            padding: '4px',
                            background: 'white'
                          }}
                          onError={(e) => {
                            console.error('❌ Logo failed to load:', logoUrl);
                            setLogoLoadError(true);
                            e.target.style.display = 'none';
                            // Show fallback
                            const parent = e.target.parentElement;
                            const fallbackDiv = document.createElement('div');
                            fallbackDiv.style.cssText = `
                              width: 200px;
                              height: 120px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              background: #f8f9fa;
                              border: 2px dashed #dee2e6;
                              border-radius: 8px;
                              flex-direction: column;
                              color: #6c757d;
                            `;
                            fallbackDiv.innerHTML = `
                              <span style="font-size: 32px;">📷</span>
                              <small style="margin-top: 8px;">Logo not found</small>
                              <small style="font-size: 10px; color: #dc3545; margin-top: 4px;">${logoUrl}</small>
                              <small style="font-size: 10px; color: #6c757d;">Source: ${logoSource}</small>
                            `;
                            parent.appendChild(fallbackDiv);
                          }}
                        />
                      ) : logoUrl && logoLoadError ? (
                        <div 
                          className="d-flex align-items-center justify-content-center bg-light"
                          style={{ 
                            width: '200px', 
                            height: '120px',
                            border: '2px dashed #dc3545',
                            borderRadius: '8px',
                            margin: '0 auto'
                          }}
                        >
                          <div className="text-center">
                            <FaImage size={40} className="text-danger" />
                            <p className="text-danger small mt-1">Logo failed to load</p>
                            <small className="text-muted" style={{ fontSize: '10px' }}>
                              Source: {logoSource}
                            </small>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="d-flex align-items-center justify-content-center bg-light"
                          style={{ 
                            width: '200px', 
                            height: '120px',
                            border: '2px dashed #dee2e6',
                            borderRadius: '8px',
                            margin: '0 auto'
                          }}
                        >
                          <div className="text-center">
                            <FaImage size={40} className="text-muted" />
                            <p className="text-muted small mt-1">No Logo</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Logo Action Buttons */}
                    {!suspensionInfo.isSuspended && (
                      <div className="mt-2 d-flex justify-content-center gap-2 flex-wrap">
                        {logoPreview ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="success" 
                              onClick={handleUploadLogo}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <FaUpload className="me-1" />
                              )}
                              Upload Vendor Logo
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={cancelLogoUpload}
                              disabled={uploadingLogo}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <label htmlFor="logo-upload" className="mb-0">
                              <input
                                id="logo-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                onChange={handleLogoSelect}
                                className="d-none"
                                disabled={suspensionInfo.isSuspended || uploadingLogo}
                              />
                              <Button 
                                size="sm" 
                                variant="outline-primary" 
                                as="span"
                                disabled={suspensionInfo.isSuspended || uploadingLogo}
                              >
                                <FaUpload className="me-1" />
                                Upload Vendor Logo
                              </Button>
                            </label>
                            {logoUrl && logoSource === 'vendor' && (
                              <Button 
                                size="sm" 
                                variant="outline-danger" 
                                onClick={handleDeleteLogo}
                                disabled={uploadingLogo}
                              >
                                <FaTrash /> Delete
                              </Button>
                            )}
                            {logoUrl && logoSource === 'admin' && (
                              <Button 
                                size="sm" 
                                variant="outline-secondary" 
                                disabled
                                title="Admin logo cannot be deleted"
                              >
                                <FaTrash /> Admin Logo (Locked)
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {!logoUrl && !logoPreview && !suspensionInfo.isSuspended && (
                      <small className="text-muted d-block mt-1">
                        Upload your vendor logo (JPEG, PNG, SVG, max 5MB)
                      </small>
                    )}
                    {logoUrl && !logoLoadError && (
                      <small className="text-success d-block mt-1">
                        <FaSync className="me-1" /> 
                        {logoSource === 'admin' ? 'Admin Logo (Read Only)' : 'Vendor Logo'}
                      </small>
                    )}
                    {logoUrl && logoLoadError && (
                      <small className="text-danger d-block mt-1">
                        <FaExclamationTriangle className="me-1" /> 
                        Logo exists but failed to load. Please re-upload.
                      </small>
                    )}
                  </div>

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
                      {logoSource === 'admin' 
                        ? 'Admin logo is managed by Admin. Vendor logo can be uploaded separately.'
                        : 'Logo will appear in your vendor documents'}
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