import { useEffect, useState } from "react";
import { Container, Card, Spinner, Row, Col, Badge } from "react-bootstrap";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_BASE = "http://localhost:5001/api/products";

const VendorCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/my-categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setCategories(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <>
      <Header />
      <div className="admin-layout mt-5">
        <Sidebar />
        <main className="admin-content">
          <Container fluid>
            <h4 className="mb-4">My Categories</h4>

            {categories.length === 0 ? (
              <Card className="p-4 text-center text-muted">
                No categories found
              </Card>
            ) : (
              <Row>
                {categories.map((cat, i) => (
                  <Col md={4} lg={3} key={i} className="mb-4">
                    <Card className="h-100 shadow-sm border-0">
                      <Card.Body className="d-flex align-items-center justify-content-between">
                        <span className="fw-semibold">{cat}</span>
                        <Badge bg="primary">Category</Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Container>
        </main>
      </div>
    </>
  );
};

export default VendorCategories;
