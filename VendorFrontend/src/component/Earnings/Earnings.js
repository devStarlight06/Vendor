// component/Earnings/Earnings.js (FIXED)
import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Spinner,
  Badge,
  Form,
  Alert,
} from "react-bootstrap";
import { motion } from "framer-motion";
import { FaRupeeSign, FaChartLine, FaDownload } from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const REACT_APP_API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const Earnings = () => {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalCommission: 0,
    totalVendorPayout: 0,
    commissionRate: 5,
    plan: "founding",
  });

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${REACT_APP_API_BASE}/orders/my-earnings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // ✅ Fix: Check if data is an array or has earnings property
        if (data && Array.isArray(data)) {
          setEarnings(data);
        } else if (data && data.earnings && Array.isArray(data.earnings)) {
          setEarnings(data.earnings);
          if (data.summary) {
            setSummary(data.summary);
          }
        } else {
          // If data is neither, set empty array
          setEarnings([]);
          console.warn("Unexpected earnings data format:", data);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching earnings:", err);
        setError(err.message);
        setLoading(false);
        setEarnings([]); // ✅ Set empty array on error
      }
    };

    fetchEarnings();
  }, []);

  // ✅ Safely calculate chart data
  const getChartData = () => {
    if (!Array.isArray(earnings) || earnings.length === 0) {
      return [];
    }

    const monthlyData = {};
    earnings.forEach((item) => {
      if (!item || !item.date) return;
      
      try {
        const date = new Date(item.date);
        if (isNaN(date.getTime())) return;
        
        const month = date.toLocaleString("en-US", { month: "short" });
        const year = date.getFullYear();
        const key = `${month}-${year}`;

        if (!monthlyData[key]) {
          monthlyData[key] = { month: `${month} ${year}`, commission: 0, sales: 0 };
        }

        monthlyData[key].commission += item.adminCommission || 0;
        monthlyData[key].sales += item.totalSales || 0;
      } catch (err) {
        console.warn("Error processing earnings item:", err);
      }
    });

    return Object.values(monthlyData);
  };

  // ✅ Safely filter earnings
  const getFilteredEarnings = () => {
    if (!Array.isArray(earnings)) return [];

    if (filter === "all") return earnings;

    const now = new Date();
    return earnings.filter((item) => {
      if (!item || !item.date) return false;
      
      try {
        const date = new Date(item.date);
        if (isNaN(date.getTime())) return false;

        if (filter === "today") {
          return date.toDateString() === now.toDateString();
        } else if (filter === "week") {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date >= weekAgo;
        } else if (filter === "month") {
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        }
        return true;
      } catch (err) {
        return false;
      }
    });
  };

  // ✅ Safely calculate totals
  const calculateTotals = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return { totalSales: 0, totalCommission: 0, totalVendorPayout: 0 };
    }

    return items.reduce(
      (acc, item) => ({
        totalSales: acc.totalSales + (item.totalSales || 0),
        totalCommission: acc.totalCommission + (item.adminCommission || 0),
        totalVendorPayout: acc.totalVendorPayout + (item.vendorPayout || 0),
      }),
      { totalSales: 0, totalCommission: 0, totalVendorPayout: 0 }
    );
  };

  const filteredEarnings = getFilteredEarnings();
  const totals = calculateTotals(filteredEarnings);
  const chartData = getChartData();

  // ✅ Get plan name safely
  const getPlanName = (plan) => {
    if (!plan) return "No Plan";
    const names = {
      founding: "Founding 100",
      growth: "Growth Seller",
      premium: "Premium Brand",
    };
    return names[plan] || plan;
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" /> Loading earnings...
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Earnings</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h4 className="mb-4">💰 Earnings Dashboard</h4>

        {/* Summary Cards */}
        <Row className="g-3 mb-4">
          <Col md={4}>
            <Card className="stat-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted">Total Sales</h6>
                    <h3 className="mb-0">₹{totals.totalSales.toLocaleString("en-IN")}</h3>
                  </div>
                  <div className="stat-icon">
                    <FaChartLine />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="stat-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted">Admin Commission ({summary.commissionRate || 5}%)</h6>
                    <h3 className="mb-0 text-warning">
                      ₹{totals.totalCommission.toLocaleString("en-IN")}
                    </h3>
                  </div>
                  <div className="stat-icon">
                    <FaRupeeSign />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="stat-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted">Your Earnings (Net)</h6>
                    <h3 className="mb-0 text-success">
                      ₹{totals.totalVendorPayout.toLocaleString("en-IN")}
                    </h3>
                    <small className="text-muted">
                      Plan: {getPlanName(summary.plan)}
                    </small>
                  </div>
                  <div className="stat-icon">
                    <FaRupeeSign />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Filter */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Form.Select
            style={{ width: "200px" }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </Form.Select>
          <Badge bg="secondary">Total Orders: {filteredEarnings.length}</Badge>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="mb-4">
            <Card.Body>
              <h6 className="mb-3">Monthly Commission Trend</h6>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke="#ffc107"
                    strokeWidth={2}
                    name="Admin Commission"
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#007bff"
                    strokeWidth={2}
                    name="Total Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        )}

        {/* Earnings Table */}
        <Card>
          <Card.Body>
            <h6 className="mb-3">Transaction History</h6>
            {filteredEarnings.length === 0 ? (
              <Alert variant="info">No earnings records found</Alert>
            ) : (
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Sales Amount</th>
                      <th>Commission ({summary.commissionRate || 5}%)</th>
                      <th>Your Earnings</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEarnings.map((item, index) => (
                      <tr key={item.orderId || index}>
                        <td>
                          <Badge bg="secondary">
                            {item.orderId ? item.orderId.slice(-6) : "N/A"}
                          </Badge>
                        </td>
                        <td>{item.productName || "Unknown"}</td>
                        <td>{item.category || "General"}</td>
                        <td>₹{(item.totalSales || 0).toFixed(2)}</td>
                        <td className="text-warning">
                          ₹{(item.adminCommission || 0).toFixed(2)}
                        </td>
                        <td className="text-success fw-bold">
                          ₹{(item.vendorPayout || 0).toFixed(2)}
                        </td>
                        <td>
                          {item.date
                            ? new Date(item.date).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-active fw-bold">
                      <td colSpan="3" className="text-end">
                        Totals:
                      </td>
                      <td>₹{totals.totalSales.toFixed(2)}</td>
                      <td className="text-warning">
                        ₹{totals.totalCommission.toFixed(2)}
                      </td>
                      <td className="text-success">
                        ₹{totals.totalVendorPayout.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </motion.div>
    </Container>
  );
};

export default Earnings;