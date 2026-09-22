import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Modal,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaUserLock } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "./login.css";

const REACT_APP_API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const Login = () => {
  const navigate = useNavigate();

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ type: "", text: "" });

  // ============================
  // LOGIN
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${REACT_APP_API_BASE}/vendor/login`, {
        email,
        password,
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("vendorId", res.data.vendor.id);
        localStorage.setItem("vendorName", res.data.vendor.name);
        localStorage.setItem("vendorCompany", res.data.vendor.company);
        localStorage.setItem("role", "vendor");

        navigate("/dashboard");
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // FORGOT PASSWORD
  // ============================
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMsg({ type: "", text: "" });
    setForgotLoading(true);

    try {
      const res = await axios.post(
        `${REACT_APP_API_BASE}/vendor/forgot-password`,
        { email: forgotEmail }
      );

      setForgotMsg({
        type: "success",
        text: res.data.message || "Reset link sent to your email.",
      });
      setForgotEmail("");
    } catch (err) {
      setForgotMsg({
        type: "danger",
        text: err.response?.data?.message || "Failed to send reset link.",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // Modal close કરો ત્યારે reset
  const closeForgotModal = () => {
    setShowForgot(false);
    setForgotMsg({ type: "", text: "" });
    setForgotEmail("");
  };

  return (
    <div className="login-page">
      <Container fluid>
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xl={4} lg={5} md={7} sm={10}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="login-card">
                <div className="login-header text-center">
                  <FaUserLock size={45} />
                  <h4>Vendor Login</h4>
                  <p>Login to your dashboard</p>
                  <small className="text-muted">
                    Use credentials provided by admin
                  </small>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Form.Group>

                  {/* 🆕 Forgot Password Link */}
                  <div className="text-end mb-3">
                    <Button
                      variant="link"
                      className="p-0"
                      style={{
                        fontSize: "14px",
                        textDecoration: "none",
                        color: "#073f31",
                        fontWeight: 500,
                      }}
                      onClick={() => setShowForgot(true)}
                      type="button"
                    >
                      Forgot Password?
                    </Button>
                  </div>

                  <Button type="submit" className="w-100" disabled={loading}>
                    {loading ? <Spinner size="sm" /> : "Login"}
                  </Button>

                  <div className="text-center mt-3">
                    <small className="text-muted">
                      Contact admin if you don't have credentials
                    </small>
                  </div>
                </Form>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>

      {/* 🆕 FORGOT PASSWORD MODAL */}
      <Modal show={showForgot} onHide={closeForgotModal} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "18px" }}>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {forgotMsg.text && (
            <Alert variant={forgotMsg.type}>{forgotMsg.text}</Alert>
          )}

          <p className="text-muted" style={{ fontSize: "14px" }}>
            Enter your registered email address. We'll send you a link to reset
            your password.
          </p>

          <Form onSubmit={handleForgotSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              type="submit"
              className="w-100"
              disabled={forgotLoading}
              style={{ backgroundColor: "#073f31", borderColor: "#073f31" }}
            >
              {forgotLoading ? <Spinner size="sm" /> : "Send Reset Link"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Login;