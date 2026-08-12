import { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
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
  FaBan,
  FaExclamationTriangle,
  FaBox,
  FaSync,
} from "react-icons/fa";
import { MdRateReview } from "react-icons/md";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_URL = process.env.REACT_APP_API_BASE + "/reviews";
const AUTH_API_URL = process.env.REACT_APP_API_BASE + "/vendor";

const Review = () => {
  const [reviews, setReviews] = useState([]);
  const [productsWithReviews, setProductsWithReviews] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDetail, setShowDetail] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showProductReviews, setShowProductReviews] = useState(false);
  
  const [filterRating, setFilterRating] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null
  });

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
      return false;
    }
  };

  // ================= FETCH REVIEWS =================
  const fetchReviews = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const allReviews = res.data.reviews || [];
      console.log(`✅ Fetched ${allReviews.length} reviews from Product collection`);
      
      // Log each review's rating to verify
      allReviews.forEach((review, index) => {
        console.log(`  Review ${index + 1}: rating=${review.rating}, user=${review.customerName}`);
      });
      
      setReviews(allReviews);
      
      // ===== GROUP REVIEWS BY PRODUCT =====
      const productMap = new Map();
      
      allReviews.forEach(review => {
        const productId = review.productId?._id || review.productId;
        
        if (productId) {
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              productId: productId,
              productName: review.productId?.name || "Unknown Product",
              productImage: review.productId?.image || null,
              reviews: [],
              averageRating: 0,
              totalReviews: 0,
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            });
          }
          const productData = productMap.get(productId);
          productData.reviews.push(review);
          productData.totalReviews++;
          
          // 🔥 FIX: Ensure rating is a number
          const rating = Math.round(Number(review.rating) || 0);
          if (rating >= 1 && rating <= 5) {
            productData.ratingDistribution[rating]++;
          }
        }
      });
      
      // Calculate average ratings
      const productsArray = Array.from(productMap.values()).map(product => {
        const sum = product.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        product.averageRating = product.totalReviews > 0 ? (sum / product.totalReviews) : 0;
        return product;
      });
      
      productsArray.sort((a, b) => b.averageRating - a.averageRating);
      
      console.log(`📦 ${productsArray.length} products with reviews`);
      productsArray.forEach(product => {
        console.log(`  - "${product.productName}": ${product.averageRating.toFixed(1)} avg (${product.totalReviews} reviews)`);
      });
      
      setProductsWithReviews(productsArray);
      setFilteredProducts(productsArray);
      
      setError("");
    } catch (err) {
      console.error("❌ Error fetching reviews:", err);
      setError(err.response?.data?.message || "Failed to fetch reviews. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    const initialize = async () => {
      if (!token) {
        setError("Please login to view reviews");
        setLoading(false);
        return;
      }

      const isSuspended = await checkVendorStatus();
      if (!isSuspended) {
        await fetchReviews(true);
      } else {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // ================= FILTER PRODUCTS =================
  useEffect(() => {
    let filtered = productsWithReviews;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterRating !== "all") {
      const rating = parseInt(filterRating);
      filtered = filtered.filter(p => 
        Math.round(p.averageRating) === rating
      );
    }
    
    setFilteredProducts(filtered);
  }, [productsWithReviews, filterRating, searchTerm]);

  // ================= DELETE REVIEW =================
  const handleDelete = async (id) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot delete reviews while account is suspended.");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      await fetchReviews(false);
      setSuccess("✅ Review deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  // ================= DELETE ALL REVIEWS FOR A PRODUCT =================
  const handleDeleteProductReviews = async (productId) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot delete reviews while account is suspended.");
      return;
    }
    
    const product = productsWithReviews.find(p => p.productId === productId);
    if (!product) return;
    
    if (!window.confirm(`Are you sure you want to delete all ${product.totalReviews} reviews for "${product.productName}"?`)) return;
    
    try {
      for (const review of product.reviews) {
        await axios.delete(`${API_URL}/${review._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      await fetchReviews(false);
      setSuccess(`✅ All reviews for "${product.productName}" deleted successfully!`);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  // ================= VIEW PRODUCT REVIEWS =================
  const handleViewProductReviews = (product) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot view reviews while account is suspended.");
      return;
    }
    setSelectedProduct(product);
    setShowProductReviews(true);
  };

  // ================= VIEW DETAIL =================
  const handleViewDetail = (review) => {
    if (suspensionInfo.isSuspended) {
      setError("Cannot view review details while account is suspended.");
      return;
    }
    setSelectedReview(review);
    setShowDetail(true);
  };

  // 🔥 FIX: Render stars with proper number conversion
  const renderStars = (rating) => {
    const numRating = Number(rating) || 0;
    const stars = [];
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 !== 0;
    
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
      ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / total).toFixed(1)
      : 0;
    const ratingCounts = {
      5: reviews.filter(r => Math.round(Number(r.rating) || 0) === 5).length,
      4: reviews.filter(r => Math.round(Number(r.rating) || 0) === 4).length,
      3: reviews.filter(r => Math.round(Number(r.rating) || 0) === 3).length,
      2: reviews.filter(r => Math.round(Number(r.rating) || 0) === 2).length,
      1: reviews.filter(r => Math.round(Number(r.rating) || 0) === 1).length,
    };
    const productsWithReviewsCount = productsWithReviews.length;
    
    return { total, avgRating, ratingCounts, productsWithReviewsCount };
  };

  const stats = getStats();

  // ================= FORMAT TIME =================
  const formatTime = (date) => {
    if (!date) return "N/A";
    try {
      const now = new Date();
      const diff = Math.floor((now - new Date(date)) / 1000);
      
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return "N/A";
    }
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
              <p className="mt-3">Loading products with reviews...</p>
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
          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

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
                    <small>Review management is disabled while your account is suspended.</small>
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* STATS CARDS */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className={`text-center ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <MdRateReview size={30} className="text-primary mb-2" />
                  <h5>Total Reviews</h5>
                  <h3>{stats.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className={`text-center ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <FaStar size={30} className="text-warning mb-2" />
                  <h5>Average Rating</h5>
                  <h3>{stats.avgRating} / 5</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className={`text-center ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                <Card.Body>
                  <FaBox size={30} className="text-success mb-2" />
                  <h5>Products with Reviews</h5>
                  <h3>{stats.productsWithReviewsCount}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className={`text-center ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
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
                                width: `${stats.total > 0 ? (stats.ratingCounts[r] / stats.total * 100) : 0}%` 
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
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <FaBox className="me-2" />
              Products with Reviews
              {!suspensionInfo.isSuspended && (
                <Badge bg="success" className="ms-2">{filteredProducts.length} Products</Badge>
              )}
            </motion.h4>

            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => fetchReviews(false)}
                disabled={suspensionInfo.isSuspended || refreshing}
              >
                <FaSync className={`me-1 ${refreshing ? 'spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>

              <Form.Control
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "200px" }}
                disabled={suspensionInfo.isSuspended}
              />
              
              <Form.Select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                style={{ width: "150px" }}
                disabled={suspensionInfo.isSuspended}
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

          {/* PRODUCTS WITH REVIEWS VIEW */}
          {!suspensionInfo.isSuspended && (
            <>
              {filteredProducts.length === 0 ? (
                <Card className="text-center py-5">
                  <Card.Body>
                    <FaBox size={50} className="text-muted mb-3" />
                    <h5>No Products with Reviews</h5>
                    <p className="text-muted">
                      {reviews.length === 0 
                        ? 'No reviews have been submitted yet' 
                        : 'No products match your filters'}
                    </p>
                  </Card.Body>
                </Card>
              ) : (
                <Row className="g-4">
                  {filteredProducts.map((product) => (
                    <Col md={6} lg={4} key={product.productId}>
                      <Card className="h-100 shadow-sm hover-shadow">
                        <Card.Body>
                          <div className="d-flex align-items-start mb-3">
                            {product.productImage ? (
                              <img 
                                src={product.productImage} 
                                alt={product.productName}
                                style={{ 
                                  width: '60px', 
                                  height: '60px', 
                                  objectFit: 'cover',
                                  borderRadius: '8px'
                                }}
                                className="me-3"
                              />
                            ) : (
                              <div 
                                className="d-flex align-items-center justify-content-center bg-light me-3"
                                style={{ 
                                  width: '60px', 
                                  height: '60px', 
                                  borderRadius: '8px' 
                                }}
                              >
                                <FaBox size={30} className="text-secondary" />
                              </div>
                            )}
                            <div className="flex-grow-1">
                              <h6 className="mb-1 text-truncate">{product.productName}</h6>
                              <div className="d-flex align-items-center">
                                {/* 🔥 FIX: Convert averageRating to number */}
                                {renderStars(Number(product.averageRating) || 0)}
                                <span className="ms-2 fw-bold">
                                  {(Number(product.averageRating) || 0).toFixed(1)}
                                </span>
                              </div>
                              <small className="text-muted">
                                {product.totalReviews} {product.totalReviews === 1 ? 'review' : 'reviews'}
                              </small>
                            </div>
                          </div>

                          {/* Rating Distribution */}
                          <div className="mb-3">
                            {[5, 4, 3, 2, 1].map(r => (
                              <div key={r} className="d-flex align-items-center small">
                                <span style={{ width: '25px' }}>{r} ★</span>
                                <div className="flex-grow-1 mx-2">
                                  <div className="progress" style={{ height: '4px' }}>
                                    <div 
                                      className="progress-bar bg-warning" 
                                      style={{ 
                                        width: `${product.totalReviews > 0 ? (product.ratingDistribution[r] / product.totalReviews * 100) : 0}%` 
                                      }}
                                    />
                                  </div>
                                </div>
                                <span style={{ width: '25px' }}>{product.ratingDistribution[r]}</span>
                              </div>
                            ))}
                          </div>

                          <div className="d-flex gap-2">
                            <Button
                              variant="info"
                              size="sm"
                              className="flex-grow-1"
                              onClick={() => handleViewProductReviews(product)}
                            >
                              <FaEye className="me-1" /> View Reviews
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteProductReviews(product.productId)}
                              title="Delete all reviews for this product"
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </>
          )}
        </Container>
      </main>

      {/* REVIEW DETAIL MODAL */}
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
                  <span className="ms-2">{formatTime(selectedReview.createdAt)}</span>
                </div>
                <div className="d-flex align-items-center">
                  <strong>Rating:</strong>
                  <span className="ms-2">
                    {/* 🔥 FIX: Convert rating to number */}
                    {renderStars(Number(selectedReview.rating) || 0)}
                    <span className="ms-2 fw-bold">{Number(selectedReview.rating) || 0}.0/5</span>
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
          </Modal.Body>
        )}

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetail(false)}>
            Close
          </Button>
          {selectedReview && !suspensionInfo.isSuspended && (
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

      {/* PRODUCT REVIEWS MODAL */}
      <Modal show={showProductReviews} onHide={() => setShowProductReviews(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBox className="me-2" />
            Reviews for: {selectedProduct?.productName}
            <Badge bg="info" className="ms-2">{selectedProduct?.totalReviews} reviews</Badge>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedProduct && (
            <>
              <div className="mb-3 p-3 bg-light rounded">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <strong>Average Rating:</strong>
                  </div>
                  <div>
                    {renderStars(Number(selectedProduct.averageRating) || 0)}
                    <span className="ms-2 fw-bold">
                      {(Number(selectedProduct.averageRating) || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <strong>Rating Distribution:</strong>
                  <div className="mt-1">
                    {[5, 4, 3, 2, 1].map(r => (
                      <div key={r} className="d-flex align-items-center small">
                        <span style={{ width: '30px' }}>{r} ★</span>
                        <div className="flex-grow-1 mx-2">
                          <div className="progress" style={{ height: '6px' }}>
                            <div 
                              className="progress-bar bg-warning" 
                              style={{ 
                                width: `${selectedProduct.totalReviews > 0 ? (selectedProduct.ratingDistribution[r] / selectedProduct.totalReviews * 100) : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        <span style={{ width: '30px' }}>{selectedProduct.ratingDistribution[r]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selectedProduct.reviews.map((review) => (
                  <Card key={review._id} className="mb-2">
                    <Card.Body className="py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="d-flex align-items-center">
                            <FaUser className="text-muted me-2" />
                            <strong>{review.customerName || "Anonymous"}</strong>
                            <span className="ms-2 text-muted small">
                              {formatTime(review.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1">
                            {/* 🔥 FIX: Convert rating to number */}
                            {renderStars(Number(review.rating) || 0)}
                            <span className="ms-2 small fw-bold">
                              {Number(review.rating) || 0}.0
                            </span>
                          </div>
                          {review.comment && (
                            <p className="mb-0 mt-1 small">{review.comment}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(review._id)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProductReviews(false)}>
            Close
          </Button>
          {selectedProduct && selectedProduct.reviews.length > 0 && !suspensionInfo.isSuspended && (
            <Button 
              variant="danger" 
              onClick={() => {
                handleDeleteProductReviews(selectedProduct.productId);
                setShowProductReviews(false);
              }}
            >
              <FaTrash /> Delete All Reviews
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hover-shadow {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .hover-shadow:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
          transform: translateY(-4px);
        }
      `}</style>
    </>
  );
};

export default Review;