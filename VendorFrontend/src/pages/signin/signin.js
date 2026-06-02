import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaUserPlus } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "../login/login.css";

const VendorRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    company: "" // 👈 company name text
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(
        "http://localhost:5001/api/auth/register",
        formData
      );
      setSuccess("Vendor registered successfully");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }

    setLoading(false);
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
                  <FaUserPlus className="login-icon" size={45} />
                  <h4>Vendor Register</h4>
                  <p>Create your vendor account</p>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      name="name"
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="text"
                      name="phone"
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  {/* ✅ COMPANY NAME INPUT */}
                  <Form.Group className="mb-3">
                    <Form.Label>Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="company"
                      placeholder="Enter company name"
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="login-btn w-100"
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : "Register"}
                  </Button>

                  <Button
                    variant="link"
                    className="w-100 mt-2"
                    onClick={() => navigate("/")}
                  >
                    Already have an account? Login
                  </Button>
                </Form>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default VendorRegister;
