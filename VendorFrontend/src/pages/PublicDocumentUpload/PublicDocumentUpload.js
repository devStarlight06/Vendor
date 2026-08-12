// pages/PublicDocumentUpload/PublicDocumentUpload.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Alert,
  Spinner,
  ProgressBar,
  Badge,
} from "react-bootstrap";
import {
  FaIdCard,
  FaFileInvoice,
  FaBuilding,
  FaUniversity,
  FaPhone,
  FaSave,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUpload,
  FaEye,
  FaTrash,
  FaFile,
  FaUser,
  FaBriefcase,
  FaMapMarkerAlt,
  FaBank,
  FaFileAlt,
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaStore,
  FaEnvelope,
  FaUserCircle,
  FaExclamationTriangle, // ✅ ADDED THIS
} from "react-icons/fa";
import axios from "axios";
import "./publicDocumentUpload.css";
const API_URL =  "http://localhost:5001/api/seller";
const API_BASE =  "http://localhost:5001"; // ✅ ADDED THIS

const PublicDocumentUpload = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [documentStatus, setDocumentStatus] = useState("draft");
  const [lastSaved, setLastSaved] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);

  const [formData, setFormData] = useState({
    aadhaar: { number: "", frontImage: "", backImage: "" },
    pan: { number: "", image: "" },
    gst: { number: "", certificate: "" },
    bank: {
      accountHolderName: "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: "",
      bankName: "",
      branchName: "",
      upiId: "",
    },
    contact: {
      phone: "",
      alternatePhone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
    business: {
      registrationType: "",
      registrationNumber: "",
      certificate: "",
    },
  });

  const autoSaveTimer = useRef(null);

  // ================= FETCH DOCUMENTS BY TRACKING ID =================
  useEffect(() => {
    const fetchDocument = async () => {
      if (!trackingId) {
        setError("Invalid link. Please check your email.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/documents/${trackingId}`);

        if (res.data.success && res.data.document) {
          const doc = res.data.document;
          setEmail(doc.email);
          setCompany(doc.company);
          setFullName(doc.fullName || doc.company || "Seller");
          setDocumentStatus(doc.status || "draft");
          setLastSaved(doc.lastSaved);
          
          setFormData({
            aadhaar: doc.aadhaar || { number: "", frontImage: "", backImage: "" },
            pan: doc.pan || { number: "", image: "" },
            gst: doc.gst || { number: "", certificate: "" },
            bank: doc.bank || {
              accountHolderName: "",
              accountNumber: "",
              confirmAccountNumber: "",
              ifscCode: "",
              bankName: "",
              branchName: "",
              upiId: "",
            },
            contact: doc.contact || {
              phone: "",
              alternatePhone: "",
              address: "",
              city: "",
              state: "",
              pincode: "",
              country: "India",
            },
            business: doc.business || {
              registrationType: "",
              registrationNumber: "",
              certificate: "",
            },
          });
        } else {
          setError("Document not found. Please check your link.");
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError(err.response?.data?.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [trackingId]);

  // ================= CALCULATE PROGRESS =================
  useEffect(() => {
    let filled = 0;
    let total = 0;
    
    const fields = [
      formData.aadhaar.number,
      formData.aadhaar.frontImage,
      formData.aadhaar.backImage,
      formData.pan.number,
      formData.pan.image,
      formData.bank.accountHolderName,
      formData.bank.accountNumber,
      formData.bank.ifscCode,
      formData.bank.bankName,
      formData.contact.phone,
      formData.contact.address,
      formData.business.registrationType,
    ];
    
    total = fields.length;
    fields.forEach(field => {
      if (field && field.trim() !== "") filled++;
    });
    
    setProgress(Math.round((filled / total) * 100));
  }, [formData]);

  // ================= AUTO-SAVE =================
  const autoSave = async () => {
    if (saving || documentStatus === 'verified' || documentStatus === 'submitted') return;

    try {
      setSaving(true);
      const res = await axios.post(
        `${API_URL}/documents/save`,
        { trackingId, ...formData },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.data.success) {
        setLastSaved(new Date());
        setDocumentStatus(res.data.document.status);
        setSuccess("Auto-saved successfully");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on field change with debounce
  const handleFieldChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      autoSave();
    }, 2000);
  };

  // ================= FILE UPLOAD =================
  const handleFileUpload = async (section, field, file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError("Only images and PDF files are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("trackingId", trackingId);
    formData.append("field", `${section}.${field}`);

    try {
      const res = await axios.post(
        `${API_URL}/documents/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      if (res.data.success) {
        setFormData((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: res.data.fileUrl,
          },
        }));
        setSuccess("File uploaded successfully");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ================= REMOVE FILE =================
  const handleRemoveFile = (section, field) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: "",
      },
    }));
    setSuccess("File removed");
    setTimeout(() => setSuccess(""), 3000);
  };

  // ================= SUBMIT DOCUMENTS =================
  const handleSubmit = async () => {
    const required = [
      { section: 'aadhaar', field: 'number', label: 'Aadhaar Number' },
      { section: 'aadhaar', field: 'frontImage', label: 'Aadhaar Front Image' },
      { section: 'aadhaar', field: 'backImage', label: 'Aadhaar Back Image' },
      { section: 'pan', field: 'number', label: 'PAN Number' },
      { section: 'pan', field: 'image', label: 'PAN Card Image' },
      { section: 'bank', field: 'accountHolderName', label: 'Account Holder Name' },
      { section: 'bank', field: 'accountNumber', label: 'Bank Account Number' },
      { section: 'bank', field: 'ifscCode', label: 'IFSC Code' },
      { section: 'bank', field: 'bankName', label: 'Bank Name' },
      { section: 'contact', field: 'phone', label: 'Phone Number' },
      { section: 'contact', field: 'address', label: 'Address' },
      { section: 'business', field: 'registrationType', label: 'Business Type' },
    ];

    const missing = [];
    for (const req of required) {
      if (!formData[req.section][req.field]) {
        missing.push(req.label);
      }
    }

    if (missing.length > 0) {
      setError(`Please fill all required fields: ${missing.join(', ')}`);
      return;
    }

    if (formData.bank.accountNumber !== formData.bank.confirmAccountNumber) {
      setError("Bank account numbers do not match");
      return;
    }

    if (!window.confirm("Are you sure you want to submit these documents for verification?")) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(
        `${API_URL}/documents/submit`,
        { trackingId },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.success) {
        setDocumentStatus('submitted');
        setSuccess("✅ Documents submitted successfully for verification!");
        setTimeout(() => setSuccess(""), 5000);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.response?.data?.message || "Failed to submit documents");
    } finally {
      setSubmitting(false);
    }
  };

  // ================= NAVIGATION =================
  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ================= GET STATUS BADGE =================
  const getStatusBadge = () => {
    switch (documentStatus) {
      case 'verified':
        return <span className="status-badge verified"><FaCheckCircle /> Verified</span>;
      case 'submitted':
        return <span className="status-badge pending"><FaClock /> Pending Verification</span>;
      case 'rejected':
        return <span className="status-badge rejected"><FaTimesCircle /> Rejected</span>;
      default:
        return <span className="status-badge draft"><FaClock /> Draft</span>;
    }
  };

  // ================= FILE PREVIEW COMPONENT =================
  const FilePreview = ({ url, onRemove, onView, isDisabled }) => {
    if (!url) return null;
    
    const fileName = url.split('/').pop();
    const fileSize = Math.round(Math.random() * 500 + 100);
    
    return (
      <div className="file-preview">
        <FaFile className="text-primary" size={24} />
        <div className="file-info">
          <div className="file-name">{fileName}</div>
          <div className="file-size">{fileSize} KB</div>
        </div>
        <div className="file-actions">
          <button 
            className="btn-icon view" 
            onClick={onView}
            title="View file"
          >
            <FaEye />
          </button>
          {!isDisabled && (
            <button 
              className="btn-icon remove" 
              onClick={onRemove}
              title="Remove file"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ================= RENDER STEP INDICATOR =================
  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: "Personal" },
      { number: 2, label: "Aadhaar" },
      { number: 3, label: "PAN & GST" },
      { number: 4, label: "Bank" },
      { number: 5, label: "Contact" },
      { number: 6, label: "Business" },
    ];

    return (
      <div className="step-indicator mb-4">
        <div className="d-flex justify-content-between align-items-center">
          {steps.map((step) => (
            <div key={step.number} className="step-item text-center">
              <div
                className={`step-circle ${currentStep === step.number ? "active" : ""} ${
                  currentStep > step.number ? "completed" : ""
                }`}
                onClick={() => {
                  if (currentStep > step.number) setCurrentStep(step.number);
                }}
                style={{ cursor: currentStep > step.number ? "pointer" : "default" }}
              >
                {currentStep > step.number ? <FaCheck /> : step.number}
              </div>
              <div className="step-label">{step.label}</div>
            </div>
          ))}
        </div>
        <div className="progress-container">
          <ProgressBar
            now={(currentStep / 6) * 100}
            className="mt-3"
            variant="primary"
            style={{ height: "6px", borderRadius: "3px" }}
          />
          <div className="text-center mt-2">
            <small className="text-muted">
              Step {currentStep} of 6 • {progress}% Complete
            </small>
          </div>
        </div>
      </div>
    );
  };

  // ================= STEP 1: PERSONAL INFORMATION =================
  const renderStep1 = () => (
    <div className="step-content">
      <h5 className="step-title">
        <FaUserCircle className="me-2 text-primary" /> Personal Information
      </h5>
      <p className="text-muted mb-4">Please confirm your personal details</p>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>First Name <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your first name"
              value={fullName?.split(' ')[0] || ""}
              disabled
              className="bg-light"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Last Name <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your last name"
              value={fullName?.split(' ').slice(1).join(' ') || ""}
              disabled
              className="bg-light"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Email Address <span className="required">*</span></Form.Label>
            <Form.Control
              type="email"
              placeholder="your@email.com"
              value={email}
              disabled
              className="bg-light"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Company / Business Name <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your company name"
              value={company}
              disabled
              className="bg-light"
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="text-end">
        <Button variant="primary" onClick={nextStep} className="px-4">
          Next Step <FaArrowRight className="ms-2" />
        </Button>
      </div>
    </div>
  );

  // ================= STEP 2: AADHAAR DETAILS =================
  const renderStep2 = () => (
    <div className="step-content">
      <h5 className="step-title">
        <FaIdCard className="me-2 text-primary" /> Aadhaar Details
      </h5>
      <Alert variant="info" className="mb-4">
        <small>
          <strong>📝 Important:</strong> Upload clear images of your Aadhaar card.
          Acceptable formats: JPG, PNG (Max 5MB each)
        </small>
      </Alert>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Aadhaar Number <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter 12-digit Aadhaar number"
              value={formData.aadhaar.number}
              onChange={(e) => handleFieldChange('aadhaar', 'number', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
              maxLength={12}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Aadhaar Front Image <span className="required">*</span></Form.Label>
            <div className="file-input-wrapper">
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('aadhaar', 'frontImage', e.target.files[0])}
                disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
              />
            </div>
            <FilePreview
              url={formData.aadhaar.frontImage}
              onView={() => window.open(`${API_BASE}${formData.aadhaar.frontImage}`, '_blank')}
              onRemove={() => handleRemoveFile('aadhaar', 'frontImage')}
              isDisabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Aadhaar Back Image <span className="required">*</span></Form.Label>
            <div className="file-input-wrapper">
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('aadhaar', 'backImage', e.target.files[0])}
                disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
              />
            </div>
            <FilePreview
              url={formData.aadhaar.backImage}
              onView={() => window.open(`${API_BASE}${formData.aadhaar.backImage}`, '_blank')}
              onRemove={() => handleRemoveFile('aadhaar', 'backImage')}
              isDisabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" onClick={prevStep}>
          <FaArrowLeft className="me-2" /> Previous
        </Button>
        <Button variant="primary" onClick={nextStep}>
          Next Step <FaArrowRight className="ms-2" />
        </Button>
      </div>
    </div>
  );

  // ================= STEP 3: PAN & GST DETAILS =================
  const renderStep3 = () => (
    <div className="step-content">
      <h5 className="step-title">
        <FaFileInvoice className="me-2 text-primary" /> PAN & GST Details
      </h5>

      <div className="mb-4">
        <h6 className="section-subtitle">PAN Details</h6>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>PAN Number <span className="required">*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter 10-digit PAN number"
                value={formData.pan.number}
                onChange={(e) => handleFieldChange('pan', 'number', e.target.value.toUpperCase())}
                disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
                maxLength={10}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>PAN Card Image <span className="required">*</span></Form.Label>
              <div className="file-input-wrapper">
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('pan', 'image', e.target.files[0])}
                  disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
                />
              </div>
              <FilePreview
                url={formData.pan.image}
                onView={() => window.open(`${API_BASE}${formData.pan.image}`, '_blank')}
                onRemove={() => handleRemoveFile('pan', 'image')}
                isDisabled={documentStatus === 'verified' || documentStatus === 'submitted'}
              />
            </Form.Group>
          </Col>
        </Row>
      </div>

      <div>
        <h6 className="section-subtitle">GST Details <span className="text-muted">(Optional)</span></h6>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>GST Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter 15-digit GST number"
                value={formData.gst.number}
                onChange={(e) => handleFieldChange('gst', 'number', e.target.value)}
                disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
                maxLength={15}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>GST Certificate</Form.Label>
              <div className="file-input-wrapper">
                <Form.Control
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload('gst', 'certificate', e.target.files[0])}
                  disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
                />
              </div>
              <FilePreview
                url={formData.gst.certificate}
                onView={() => window.open(`${API_BASE}${formData.gst.certificate}`, '_blank')}
                onRemove={() => handleRemoveFile('gst', 'certificate')}
                isDisabled={documentStatus === 'verified' || documentStatus === 'submitted'}
              />
            </Form.Group>
          </Col>
        </Row>
      </div>

      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" onClick={prevStep}>
          <FaArrowLeft className="me-2" /> Previous
        </Button>
        <Button variant="primary" onClick={nextStep}>
          Next Step <FaArrowRight className="ms-2" />
        </Button>
      </div>
    </div>
  );

  // ================= STEP 4: BANK DETAILS =================
  const renderStep4 = () => (
    <div className="step-content">
      <h5 className="step-title">
        <FaUniversity className="me-2 text-primary" /> Bank Account Details
      </h5>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Account Holder Name <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter account holder name"
              value={formData.bank.accountHolderName}
              onChange={(e) => handleFieldChange('bank', 'accountHolderName', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Bank Name <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter bank name"
              value={formData.bank.bankName}
              onChange={(e) => handleFieldChange('bank', 'bankName', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Account Number <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter bank account number"
              value={formData.bank.accountNumber}
              onChange={(e) => handleFieldChange('bank', 'accountNumber', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Confirm Account Number <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Re-enter bank account number"
              value={formData.bank.confirmAccountNumber}
              onChange={(e) => handleFieldChange('bank', 'confirmAccountNumber', e.target.value)}
              isInvalid={formData.bank.accountNumber !== formData.bank.confirmAccountNumber && formData.bank.confirmAccountNumber !== ''}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
            {formData.bank.accountNumber !== formData.bank.confirmAccountNumber && formData.bank.confirmAccountNumber !== '' && (
              <Form.Text className="text-danger">Account numbers do not match</Form.Text>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>IFSC Code <span className="required">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter IFSC code (e.g., SBIN0001234)"
              value={formData.bank.ifscCode}
              onChange={(e) => handleFieldChange('bank', 'ifscCode', e.target.value.toUpperCase())}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>UPI ID <span className="text-muted">(Optional)</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter UPI ID (e.g., seller@upi)"
              value={formData.bank.upiId}
              onChange={(e) => handleFieldChange('bank', 'upiId', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" onClick={prevStep}>
          <FaArrowLeft className="me-2" /> Previous
        </Button>
        <Button variant="primary" onClick={nextStep}>
          Next Step <FaArrowRight className="ms-2" />
        </Button>
      </div>
    </div>
  );

  // ================= STEP 5: CONTACT INFORMATION =================
  const renderStep5 = () => (
    <div className="step-content">
      <h5 className="step-title">
        <FaPhone className="me-2 text-primary" /> Contact Information
      </h5>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Phone Number <span className="required">*</span></Form.Label>
            <Form.Control
              type="tel"
              placeholder="Enter phone number"
              value={formData.contact.phone}
              onChange={(e) => handleFieldChange('contact', 'phone', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Alternate Phone Number</Form.Label>
            <Form.Control
              type="tel"
              placeholder="Enter alternate phone number"
              value={formData.contact.alternatePhone}
              onChange={(e) => handleFieldChange('contact', 'alternatePhone', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label>Address <span className="required">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Enter complete address"
              value={formData.contact.address}
              onChange={(e) => handleFieldChange('contact', 'address', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>City</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter city"
              value={formData.contact.city}
              onChange={(e) => handleFieldChange('contact', 'city', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>State</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter state"
              value={formData.contact.state}
              onChange={(e) => handleFieldChange('contact', 'state', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Pincode</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter pincode"
              value={formData.contact.pincode}
              onChange={(e) => handleFieldChange('contact', 'pincode', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Country</Form.Label>
            <Form.Control
              type="text"
              value={formData.contact.country}
              onChange={(e) => handleFieldChange('contact', 'country', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" onClick={prevStep}>
          <FaArrowLeft className="me-2" /> Previous
        </Button>
        <Button variant="primary" onClick={nextStep}>
          Next Step <FaArrowRight className="ms-2" />
        </Button>
      </div>
    </div>
  );

  // ================= STEP 6: BUSINESS INFORMATION =================
  const renderStep6 = () => (
    <div className="step-content">
      <h5 className="step-title">
        <FaBriefcase className="me-2 text-primary" /> Business Information
      </h5>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Registration Type <span className="required">*</span></Form.Label>
            <Form.Select
              value={formData.business.registrationType}
              onChange={(e) => handleFieldChange('business', 'registrationType', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            >
              <option value="">Select Registration Type</option>
              <option value="sole_proprietorship">Sole Proprietorship</option>
              <option value="partnership">Partnership</option>
              <option value="llp">LLP</option>
              <option value="private_limited">Private Limited</option>
              <option value="public_limited">Public Limited</option>
              <option value="trust">Trust</option>
              <option value="other">Other</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Registration Number</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter registration number"
              value={formData.business.registrationNumber}
              onChange={(e) => handleFieldChange('business', 'registrationNumber', e.target.value)}
              disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label>Registration Certificate</Form.Label>
            <div className="file-input-wrapper">
              <Form.Control
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileUpload('business', 'certificate', e.target.files[0])}
                disabled={documentStatus === 'verified' || documentStatus === 'submitted'}
              />
            </div>
            <FilePreview
              url={formData.business.certificate}
              onView={() => window.open(`${API_BASE}${formData.business.certificate}`, '_blank')}
              onRemove={() => handleRemoveFile('business', 'certificate')}
              isDisabled={documentStatus === 'verified' || documentStatus === 'submitted'}
            />
          </Form.Group>
        </Col>
      </Row>

      <Alert variant="warning" className="mt-3">
        <strong>📋 Before Submitting:</strong>
        <ul className="mb-0 mt-1">
          <li>Review all information for accuracy</li>
          <li>Ensure all required fields are filled</li>
          <li>Check that all documents are uploaded</li>
          <li>You can save as draft and continue later</li>
        </ul>
      </Alert>

      <div className="d-flex justify-content-between mt-3">
        <Button variant="secondary" onClick={prevStep}>
          <FaArrowLeft className="me-2" /> Previous
        </Button>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={autoSave} disabled={saving || documentStatus === 'verified' || documentStatus === 'submitted'}>
            <FaSave className="me-2" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button 
            variant="success" 
            onClick={handleSubmit} 
            disabled={submitting || documentStatus === 'verified' || documentStatus === 'submitted'}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" /> Submitting...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" /> Submit Documents
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // ================= RENDER =================
  if (loading) {
    return (
      <section className="document-upload-page">
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading your document form...</p>
        </Container>
      </section>
    );
  }

  if (error && !email) {
    return (
      <section className="document-upload-page">
        <Container className="py-5">
          <Card className="text-center p-5 shadow-sm">
            <FaExclamationTriangle size={50} className="text-danger mx-auto mb-3" />
            <h3>Invalid Link</h3>
            <p className="text-muted">{error}</p>
            <Button variant="primary" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </Card>
        </Container>
      </section>
    );
  }

  const isDisabled = documentStatus === 'verified' || documentStatus === 'submitted';

  return (
    <section className="document-upload-page">
      <Container>
        {/* Header */}
        <div className="section-header">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h2>
                <FaFileAlt className="me-2" />
                Seller Verification Documents
              </h2>
              <div className="subtitle">
                <strong>Tracking ID:</strong> <span className="tracking-id">{trackingId}</span>
              </div>
            </div>
            <div className="status-area">
              {getStatusBadge()}
              {lastSaved && (
                <div className="text-muted small mt-1">
                  <FaClock className="me-1" /> Last saved: {new Date(lastSaved).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

        {/* Status Alerts */}
        {documentStatus === 'verified' && (
          <Alert variant="success" className="mb-4">
            <FaCheckCircle className="me-2" />
            <strong>Congratulations!</strong> Your documents have been verified.
          </Alert>
        )}

        {documentStatus === 'rejected' && (
          <Alert variant="danger" className="mb-4">
            <FaTimesCircle className="me-2" />
            <strong>Documents Rejected.</strong> Please review and resubmit.
          </Alert>
        )}

        {documentStatus === 'submitted' && (
          <Alert variant="warning" className="mb-4">
            <FaClock className="me-2" />
            <strong>Documents Submitted.</strong> Our team is reviewing your documents.
          </Alert>
        )}

        {/* Step Indicator */}
        {!isDisabled && renderStepIndicator()}

        {/* Upload Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="progress-label">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="step-container">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>

        {/* Help Text */}
        <div className="help-text">
          <p><span className="text-danger">*</span> Required fields. Documents are auto-saved every 2 seconds.</p>
          <p>Supported file types: JPEG, PNG, GIF, WEBP, PDF (Max 10MB)</p>
        </div>
      </Container>
    </section>
  );
};

export default PublicDocumentUpload;