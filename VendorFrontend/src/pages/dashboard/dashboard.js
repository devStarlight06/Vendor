// vendor/Dashboard.js - Using existing endpoint for status

import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Badge, Alert, Table } from "react-bootstrap"; 
import { motion } from "framer-motion";
import {
  FaRupeeSign,
  FaShoppingCart,
  FaClock,
  FaTimesCircle,
  FaCrown,
  FaRocket,
  FaChartLine,
  FaInfoCircle,
  FaBan
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";
import "./dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [adminCommissionData, setAdminCommissionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorPlan, setVendorPlan] = useState(null);
  const [commissionRate, setCommissionRate] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  
  // ✅ Suspension state - will be populated from vendor data
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null,
    statusHistory: []
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // ✅ FIX: Use existing endpoint to get vendor data (includes status)
        let vendorData = null;
        try {
          const res = await fetch(`https://api.brandelsuperadmin.starlighttechlabsindia.com/api/customers/vendors/me`, { headers });
          if (res.ok) {
            const data = await res.json();
            vendorData = data.vendor || data;
            console.log("Vendor data:", vendorData);
            
            // ✅ Extract status info from vendor data
            if (vendorData) {
              setVendorPlan(vendorData);
              const rate = vendorData.commissionRate || vendorData.commission_rate || 8;
              setCommissionRate(rate);
              
              // ✅ Set suspension info from vendor data
              if (vendorData.status === 'suspended') {
                setSuspensionInfo({
                  isSuspended: true,
                  reason: vendorData.suspensionReason || 'No reason provided',
                  suspendedAt: vendorData.suspendedAt,
                  statusHistory: vendorData.statusHistory || []
                });
              } else {
                setSuspensionInfo({
                  isSuspended: false,
                  reason: '',
                  suspendedAt: null,
                  statusHistory: vendorData.statusHistory || []
                });
              }
            }
          } else {
            // Fallback to /products/my-plan
            const planRes = await fetch(`${API_BASE}/products/my-plan`, { headers });
            if (planRes.ok) {
              const data = await planRes.json();
              const vendorData = data.vendor || data;
              setVendorPlan(vendorData);
              const rate = vendorData.commissionRate || vendorData.commission_rate || 8;
              setCommissionRate(rate);
            }
          }
        } catch (planErr) {
          console.warn("Plan fetch error:", planErr.message);
        }

        // ===== 2. FETCH ORDERS =====
        const ordersRes = await fetch(`${API_BASE}/orders/my-orders`, { headers });
        let ordersData = [];
        if (ordersRes.ok) {
          ordersData = await ordersRes.json();
          ordersData = ordersData.orders || ordersData || [];
        }

        // ===== 3. FETCH EARNINGS =====
        const earningsRes = await fetch(`${API_BASE}/orders/my-earnings`, { headers });
        let earningsData = [];
        if (earningsRes.ok) {
          earningsData = await earningsRes.json();
          earningsData = earningsData.earnings || earningsData || [];
          
          if (earningsData.summary && earningsData.summary.commissionRate) {
            setCommissionRate(earningsData.summary.commissionRate);
          }
        }

        setOrders(ordersData);
        setEarnings(earningsData);
        setTotalOrdersCount(ordersData.length);

        // ===== 4. PROCESS STATS =====
        const rate = commissionRate || 8;
        const earningsList = earningsData.earnings || earningsData || [];
        
        const totalSales = earningsList.reduce((sum, e) => sum + (e.totalSales || e.amount || 0), 0);
        const totalAdminPay = earningsList.reduce((sum, e) => sum + (e.adminCommission || e.commission || 0), 0);
        const totalVendorPayout = earningsList.reduce((sum, e) => sum + (e.vendorPayout || e.vendorEarnings || 0), 0);

        setStats([
          {
            title: "Total Sales",
            value: `₹${totalSales.toLocaleString("en-IN")}`,
            icon: <FaRupeeSign />,
            color: "#4CAF50"
          },
          {
            title: `Admin Commission`,
            value: `₹${totalAdminPay.toLocaleString("en-IN")}`,
            icon: <FaChartLine />,
            color: "#FF9800"
          },
          {
            title: "Your Earnings (Net)",
            value: `₹${totalVendorPayout.toLocaleString("en-IN")}`,
            icon: <FaRupeeSign />,
            color: "#2196F3"
          },
          {
            title: "Total Orders",
            value: ordersData.length,
            icon: <FaShoppingCart />,
            color: "#9C27B0"
          },
        ]);

        // Chart data
        const monthlySalesMap = {};
        const adminMonthly = {};
        earningsList.forEach(e => {
          const date = e.date || e.createdAt;
          if (!date) return;
          const month = new Date(date).toLocaleString("en-US", { month: "short" });
          monthlySalesMap[month] = (monthlySalesMap[month] || 0) + (e.totalSales || e.amount || 0);
          adminMonthly[month] = (adminMonthly[month] || 0) + (e.adminCommission || e.commission || 0);
        });

        setSalesData(Object.keys(monthlySalesMap).map(m => ({ month: m, sales: monthlySalesMap[m] })));
        setAdminCommissionData(Object.keys(adminMonthly).map(m => ({ month: m, commission: Math.round(adminMonthly[m]) })));

        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const getPlanIcon = (plan) => {
    if (!plan) return <FaInfoCircle className="me-2" />;
    const icons = {
      'founding': <FaRocket className="me-2" />,
      'growth': <FaChartLine className="me-2" />,
      'premium': <FaCrown className="me-2" />
    };
    return icons[plan] || <FaInfoCircle className="me-2" />;
  };

  const getPlanColor = (plan) => {
    if (!plan) return 'secondary';
    const colors = {
      'founding': 'success',
      'growth': 'primary',
      'premium': 'warning'
    };
    return colors[plan] || 'secondary';
  };

  const getPlanName = (plan) => {
    if (!plan) return 'No Plan';
    const names = {
      'founding': 'Founding 100',
      'growth': 'Growth Seller',
      'premium': 'Premium Brand'
    };
    return names[plan] || plan;
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
              <p className="mt-3">Loading dashboard...</p>
            </div>
          </Container>
        </main>
      </>
    );
  }

  const hasPlan = vendorPlan && vendorPlan.plan;

  return (
    <>
      <Header />
      <div className="admin-layout">
        <Sidebar />
        <main className="admin-content mt-5">
          <Container fluid>
            
            {/* 🚫 SUSPENSION ALERT */}
            {suspensionInfo.isSuspended && (
              <Alert variant="danger" className="mb-4">
                <div className="d-flex align-items-start">
                  <FaBan className="me-3 mt-1" style={{ fontSize: '28px' }} />
                  <div>
                    <h5 className="mb-1">⚠️ Account Suspended</h5>
                    <p className="mb-1">
                      <strong>Reason:</strong> {suspensionInfo.reason || 'No reason provided'}
                    </p>
                    {suspensionInfo.suspendedAt && (
                      <small className="text-muted d-block">
                        Suspended on: {new Date(suspensionInfo.suspendedAt).toLocaleString()}
                      </small>
                    )}
                    <p className="mt-2 mb-0">
                      <small>Please contact admin to resolve this issue. Your dashboard is limited while suspended.</small>
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            {/* ===== PLAN CARD ===== */}
            {hasPlan ? (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <Card className={`plan-card-simple ${suspensionInfo.isSuspended ? 'border-danger' : ''}`}>
                  <Card.Body className="d-flex align-items-center justify-content-between flex-wrap">
                    <div className="d-flex align-items-center">
                      <span className="plan-icon-small">
                        {getPlanIcon(vendorPlan.plan)}
                      </span>
                      <div className="ms-2">
                        <span className="plan-name">
                          Plan: {getPlanName(vendorPlan.plan)}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <Badge bg={getPlanColor(vendorPlan.plan)} pill>
                        {vendorPlan.plan.toUpperCase()}
                      </Badge>
                      <Badge bg="info" pill>
                        Commission: {commissionRate || 8}%
                      </Badge>
                      {vendorPlan.plan === 'founding' && commissionRate === 0 && (
                        <Badge bg="warning" pill className="text-dark">
                          🔥 Offer Active
                        </Badge>
                      )}
                      <Badge bg={suspensionInfo.isSuspended ? 'danger' : (vendorPlan.status === 'active' ? 'success' : 'warning')} pill>
                        {suspensionInfo.isSuspended ? '🚫 SUSPENDED' : (vendorPlan.status || 'active')}
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            ) : (
              <Alert variant="warning" className="mb-4">
                <FaInfoCircle className="me-2" />
                <strong>No plan assigned yet.</strong> Please contact admin to assign a plan.
              </Alert>
            )}

            {/* ===== STATS CARDS ===== */}
            <Row className="g-3 mb-4">
              {stats.map((item, index) => (
                <Col lg={3} md={6} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`stat-card-simple ${suspensionInfo.isSuspended ? 'opacity-50' : ''}`}>
                      <Card.Body>
                        <div className="stat-label">{item.title}</div>
                        <div className="stat-value-large">{item.value}</div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>

            {/* ===== CHARTS ===== */}
            {!suspensionInfo.isSuspended && (
              <>
                <Row className="g-4 mb-4">
                  <Col lg={6}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="chart-card">
                        <Card.Body>
                          <h5 className="mb-3">Monthly Sales</h5>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={salesData.length > 0 ? salesData : [{ month: 'No Data', sales: 0 }]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="month" stroke="#888" fontSize={12} />
                              <YAxis stroke="#888" fontSize={12} />
                              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                              <Line type="monotone" dataKey="sales" stroke="#4CAF50" strokeWidth={3} dot={{ fill: '#4CAF50', r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>
                  <Col lg={6}>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="chart-card">
                        <Card.Body>
                          <h5 className="mb-3">Admin Earnings (Monthly)</h5>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={adminCommissionData.length > 0 ? adminCommissionData : [{ month: 'No Data', commission: 0 }]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="month" stroke="#888" fontSize={12} />
                              <YAxis stroke="#888" fontSize={12} />
                              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                              <Line type="monotone" dataKey="commission" stroke="#FF9800" strokeWidth={3} dot={{ fill: '#FF9800', r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>
                </Row>

                {/* ===== EARNINGS TABLE ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="table-card">
                    <Card.Header className="table-header">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">💰 Earnings Details</h5>
                        <Badge bg="light" text="dark" pill>
                          Total Orders: {totalOrdersCount}
                        </Badge>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <div className="table-responsive">
                        <Table hover className="earnings-table mb-0">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Sales Amount</th>
                              <th>Commission ({commissionRate || 8}%)</th>
                              <th>Your Earnings</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {earnings.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="text-center text-muted py-4">
                                  No earnings data available
                                </td>
                              </tr>
                            ) : (
                              earnings.map((item, index) => (
                                <tr key={item.orderId || index}>
                                  <td>
                                    <div className="product-name">{item.productName || 'Product'}</div>
                                    <small className="text-muted">{item.category || 'General'}</small>
                                  </td>
                                  <td className="">₹{Number(item.totalSales || item.amount || 0).toFixed(2)}</td>
                                  <td className="text-warning">₹{Number(item.adminCommission || item.commission || 0).toFixed(2)}</td>
                                  <td className="text-success fw-bold">₹{Number(item.vendorPayout || item.vendorEarnings || 0).toFixed(2)}</td>
                                  <td>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </motion.div>
              </>
            )}

            {/* 🚫 SHOW WHEN SUSPENDED */}
            {suspensionInfo.isSuspended && (
              <Alert variant="secondary" className="text-center mt-4">
                <FaBan className="me-2" />
                <strong>Limited View:</strong> Dashboard features are restricted while your account is suspended.
              </Alert>
            )}

          </Container>
        </main>
      </div>
    </>
  );
};

export default Dashboard;