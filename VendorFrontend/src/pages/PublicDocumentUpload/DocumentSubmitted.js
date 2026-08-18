// src/pages/DocumentSubmitted.jsx
import React from "react";
import { Container, Card, Button } from "react-bootstrap";
import { FaCheckCircle, FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const DocumentSubmitted = () => {
  const navigate = useNavigate();

  return (
    <Container className="py-5">
      <Card className="text-center p-5 shadow-sm border-0">
        <FaCheckCircle size={80} className="text-success mx-auto mb-4" />
        <h2 className="mb-3">🎉 Documents Submitted Successfully!</h2>
        <p className="text-muted mb-4">
          Thank you for submitting your documents. Our team will review them
          within 24-48 hours.
        </p>
        <p className="text-muted mb-4">
          You will receive an email notification once your documents are verified.
          You will then receive your login credentials to access the seller dashboard.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Button variant="primary" onClick={() => navigate("/")}>
            <FaHome className="me-2" /> Go to Home
          </Button>
        </div>
      </Card>
    </Container>
  );
};

export default DocumentSubmitted;
