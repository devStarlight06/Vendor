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
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaUserLock } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "./login.css";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5001/api/vendor/login",  // Changed port and endpoint
        { email, password }
      );

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
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
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
                  <small className="text-muted">Use credentials provided by admin</small>
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

                  <Button type="submit" className="w-100" disabled={loading}>
                    {loading ? <Spinner size="sm" /> : "Login"}
                  </Button>

                  {/* Register button removed - vendors cannot self-register */}
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
    </div>
  );
};

export default Login;