import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import axios from "axios";

const REACT_APP_API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 🆕 Show/hide toggle state
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Verify token on load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await axios.get(
          `${REACT_APP_API_BASE}/vendor/verify-reset-token/${token}`
        );
        if (res.data.valid) {
          setValidToken(true);
          setEmail(res.data.email);
        } else {
          setMsg({ type: "danger", text: res.data.message });
        }
      } catch (err) {
        setMsg({
          type: "danger",
          text:
            err.response?.data?.message ||
            "Invalid or expired reset link.",
        });
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (newPassword.length < 6) {
      setMsg({
        type: "danger",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: "danger", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${REACT_APP_API_BASE}/vendor/reset-password`,
        { token, newPassword }
      );

      setMsg({ type: "success", text: res.data.message });
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setMsg({
        type: "danger",
        text:
          err.response?.data?.message ||
          "Failed to reset password. Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Live check: passwords match?
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDontMatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  if (verifying) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="success" />
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col xl={4} lg={5} md={7} sm={10}>
          <Card className="p-4 shadow">
            <h4 className="text-center mb-3">Reset Your Password</h4>

            {msg.text && <Alert variant={msg.type}>{msg.text}</Alert>}

            {validToken && (
              <>
                <p
                  className="text-muted text-center"
                  style={{ fontSize: "14px" }}
                >
                  Resetting password for <strong>{email}</strong>
                </p>

                <Form onSubmit={handleSubmit}>
                  {/* 🆕 New Password with Eye Icon */}
                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showNew ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        variant="outline-secondary"
                        type="button"
                        onClick={() => setShowNew((s) => !s)}
                        title={showNew ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showNew ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Minimum 6 characters
                    </Form.Text>
                  </Form.Group>

                  {/* 🆕 Confirm Password with Eye Icon */}
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm New Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        isInvalid={passwordsDontMatch}
                        isValid={passwordsMatch}
                      />
                      <Button
                        variant="outline-secondary"
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        title={showConfirm ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showConfirm ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                      {/* ✅ Match indicator */}
                      {passwordsMatch && (
                        <InputGroup.Text
                          style={{
                            background: "#e8f5e9",
                            color: "#2e7d32",
                            fontWeight: "bold",
                          }}
                        >
                          ✓
                        </InputGroup.Text>
                      )}
                      {passwordsDontMatch && (
                        <InputGroup.Text
                          style={{
                            background: "#ffebee",
                            color: "#c62828",
                            fontWeight: "bold",
                          }}
                        >
                          ✕
                        </InputGroup.Text>
                      )}
                    </InputGroup>

                    {/* ✅ Live feedback text */}
                    {passwordsMatch && (
                      <Form.Text style={{ color: "#2e7d32", fontWeight: 600 }}>
                        ✓ Passwords match
                      </Form.Text>
                    )}
                    {passwordsDontMatch && (
                      <Form.Text style={{ color: "#c62828", fontWeight: 600 }}>
                        ✕ Passwords do not match
                      </Form.Text>
                    )}
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100"
                    disabled={loading || passwordsDontMatch || !newPassword || !confirmPassword}
                    style={{
                      backgroundColor: "#073f31",
                      borderColor: "#073f31",
                    }}
                  >
                    {loading ? <Spinner size="sm" /> : "Reset Password"}
                  </Button>
                </Form>
              </>
            )}

            {!validToken && (
              <div className="text-center mt-3">
                <Button variant="link" onClick={() => navigate("/")}>
                  ← Back to Login
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;