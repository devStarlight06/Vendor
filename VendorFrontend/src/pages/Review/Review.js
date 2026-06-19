import { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Table,
  Button,
  Modal,
  Spinner,
  Alert,
  Badge,
  Row,
  Col,
  Card,
  Form,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { 
  FaStar, 
  FaStarHalfAlt, 
  FaRegStar,
  FaTrash, 
  FaEye,
  FaUser,
  FaShoppingBag,
  FaClock,
  FaComments,
  FaFilter
} from "react-icons/fa";
import { MdRateReview } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

// const API_URL = "http://localhost:5001/api/reviews";
const API_URL = process.env.REACT_APP_API_BASE + "/reviews"; // Use environment variable for API base URL
const Review = () => {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDetail, setShowDetail] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  
  // Filters
  const [filterRating, setFilterRating] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  // ================= FETCH REVIEWS =================
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(res.data.reviews);
      setFilteredReviews(res.data.reviews);
      setError("");
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= FILTER REVIEWS =================
  useEffect(() => {
    let filtered = reviews;
    
    // Filter by rating
    if (filterRating !== "all") {
      filtered = filtered.filter(r => r.rating === parseInt(filterRating));
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.productId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredReviews(filtered);
  }, [reviews, filterRating, searchTerm]);

  // ================= DELETE REVIEW =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(reviews.filter((r) => r._id !== id));
      setSuccess("Review deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  // ================= VIEW DETAIL =================
  const handleViewDetail = (review) => {
    setSelectedReview(review);
    setShowDetail(true);
  };

  // ================= RENDER STARS =================
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={`full-${i}`} className="text-warning" />);
    }
    
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className="text-warning" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="text-secondary" />);
    }
    
    return stars;
  };

  // ================= STATS =================
  const getStats = () => {
    const total = reviews.length;
    const avgRating = total > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
      : 0;
    const ratingCounts = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };
    const withComments = reviews.filter(r => r.comment && r.comment.length > 0).length;
    
    return { total, avgRating, ratingCounts, withComments };
  };

  const stats = getStats();

  // ================= FORMAT TIME =================
  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Loading reviews...
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

          {/* STATS CARDS */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <MdRateReview size={30} className="text-primary mb-2" />
                  <h5>Total Reviews</h5>
                  <h3>{stats.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaStar size={30} className="text-warning mb-2" />
                  <h5>Average Rating</h5>
                  <h3>{stats.avgRating} / 5</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaComments size={30} className="text-info mb-2" />
                  <h5>With Comments</h5>
                  <h3>{stats.withComments}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <div className="mb-2">
                    {[5, 4, 3, 2, 1].map(r => (
                      <div key={r} className="d-flex justify-content-between align-items-center small">
                        <span>{r} ★</span>
                        <div className="flex-grow-1 mx-2">
                          <div className="progress" style={{ height: "6px" }}>
                            <div 
                              className="progress-bar bg-warning" 
                              style={{ 
                                width: `${(stats.ratingCounts[r] / stats.total * 100) || 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        <span>{stats.ratingCounts[r]}</span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* HEADER WITH FILTERS */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Customer Reviews
              <Badge bg="primary" className="ms-2">{filteredReviews.length}</Badge>
            </motion.h4>

            <div className="d-flex gap-2">
              {/* Search */}
              <Form.Control
                type="text"
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "200px" }}
              />
              
              {/* Rating Filter */}
              <Form.Select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="all">All Ratings</option>
                <option value="5">5 ★</option>
                <option value="4">4 ★</option>
                <option value="3">3 ★</option>
                <option value="2">2 ★</option>
                <option value="1">1 ★</option>
              </Form.Select>
            </div>
          </div>

          {/* TABLE */}
          <Table responsive bordered hover>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "15%" }}>Customer</th>
                <th style={{ width: "20%" }}>Product</th>
                <th style={{ width: "15%" }}>Rating</th>
                <th>Review</th>
                <th style={{ width: "12%" }}>Date</th>
                <th style={{ width: "12%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <MdRateReview size={50} className="text-muted mb-3" />
                    <p className="text-muted">
                      {reviews.length === 0 ? "No reviews yet" : "No reviews match your filters"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review, index) => (
                  <tr key={review._id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FaUser className="text-muted me-2" />
                        <span>{review.customerName || "Anonymous"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FaShoppingBag className="text-muted me-2" />
                        <span>{review.productId?.name || "Unknown Product"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        {renderStars(review.rating)}
                        <span className="ms-2 fw-bold">{review.rating}.0</span>
                      </div>
                    </td>
                    <td>
                      {review.comment ? (
                        review.comment.length > 80 ? (
                          <>
                            {review.comment.substring(0, 80)}...
                            <Button
                              size="sm"
                              variant="link"
                              className="p-0 ms-1"
                              onClick={() => handleViewDetail(review)}
                            >
                              Read more
                            </Button>
                          </>
                        ) : (
                          review.comment
                        )
                      ) : (
                        <span className="text-muted fst-italic">No comment</span>
                      )}
                    </td>
                    <td>
                      <small className="text-muted">
                        <FaClock className="me-1" />
                        {formatTime(review.createdAt)}
                      </small>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-info"
                        className="me-1"
                        onClick={() => handleViewDetail(review)}
                        title="View details"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(review._id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Container>
      </main>

      {/* ================= REVIEW DETAIL MODAL ================= */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <MdRateReview className="me-2" />
            Review Details
          </Modal.Title>
        </Modal.Header>

        {selectedReview && (
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <div className="d-flex align-items-center mb-2">
                  <FaUser className="text-muted me-2" />
                  <strong>Customer:</strong>
                  <span className="ms-2">{selectedReview.customerName || "Anonymous"}</span>
                </div>
                <div className="d-flex align-items-center">
                  <FaShoppingBag className="text-muted me-2" />
                  <strong>Product:</strong>
                  <span className="ms-2">{selectedReview.productId?.name || "Unknown Product"}</span>
                </div>
              </Col>
              <Col md={6}>
                <div className="d-flex align-items-center mb-2">
                  <FaClock className="text-muted me-2" />
                  <strong>Date:</strong>
                  <span className="ms-2">{new Date(selectedReview.createdAt).toLocaleString()}</span>
                </div>
                <div className="d-flex align-items-center">
                  <strong>Rating:</strong>
                  <span className="ms-2">
                    {renderStars(selectedReview.rating)} 
                    <span className="ms-2 fw-bold">{selectedReview.rating}.0/5</span>
                  </span>
                </div>
              </Col>
            </Row>

            <div className="mt-3">
              <strong>Review:</strong>
              <div className="p-3 bg-light rounded mt-2">
                <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {selectedReview.comment || "No comment provided"}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <small className="text-muted">
                Company: {selectedReview.company}
              </small>
            </div>
          </Modal.Body>
        )}

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetail(false)}>
            Close
          </Button>
          {selectedReview && (
            <Button 
              variant="danger" 
              onClick={() => {
                handleDelete(selectedReview._id);
                setShowDetail(false);
              }}
            >
              <FaTrash /> Delete Review
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Review;