// vendor/Dashboard.js - UPDATED WITH PLAN DISPLAY, FREE MONTHS & COMMISSION

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
  FaBan,
  FaTag,
  FaCheckCircle,
  FaCalendarAlt
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

// ✅ Plan Configuration
const PLAN_DETAILS = {
  'STARTER': {
    name: 'STARTER',
    monthlyFee: 499,
    commissionRate: 12,
    color: '#6c757d',
    bgColor: '#f8f9fa',
    borderColor: '#6c757d',
    description: 'Best for new sellers',
    features: [
      'Up to 25 product listings',
      '1 Homepage Feature/month',
      '2 Category Features/month',
      '3 Social Media Feature/month',
      'Seller Dashboard & Analytics',
      'Access to Seasonal Campaigns'
    ]
  },
  'GROWTH': {
    name: 'GROWTH',
    monthlyFee: 1499,
    commissionRate: 9,
    color: '#007bff',
    bgColor: '#cce5ff',
    borderColor: '#007bff',
    description: 'For growing businesses',
    features: [
      'Up to 100 product listings',
      '2 Homepage Feature/month',
      '4 Category Features/month',
      '5 Social Media Features/month',
      'Seller Dashboard & Analytics',
      'Order Management',
      'Access to Seasonal Campaigns'
    ]
  },
  'PREMIUM': {
    name: 'PREMIUM',
    monthlyFee: 3999,
    commissionRate: 6,
    color: '#ffc107',
    bgColor: '#fff3cd',
    borderColor: '#ffc107',
    description: 'For established brands',
    features: [
      'Unlimited Listings',
      '4 Homepage Features/month',
      '8 Category Features/month',
      'Advanced Analytics',
      'Priority Support'
    ]
  }
};

// ✅ Free Months Configuration
const FREE_MONTHS = [
  { month: 'September 2026', isFree: true, description: '🎉 Launch Offer - 0% Commission' },
  { month: 'November 2026', isFree: true, description: '🎉 Free Month Offer - 0% Commission' }
];

const getPlanDetails = (planKey) => {
  return PLAN_DETAILS[planKey] || PLAN_DETAILS['STARTER'];
};

const isCurrentMonthFree = () => {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const currentMonth = `${month} ${year}`;
  return FREE_MONTHS.some(fm => fm.month === currentMonth && fm.isFree);
};

const getCurrentFreeMonthDescription = () => {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const currentMonth = `${month} ${year}`;
  const freeMonth = FREE_MONTHS.find(fm => fm.month === currentMonth && fm.isFree);
  return freeMonth?.description || null;
};

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
  const [vendorData, setVendorData] = useState(null);
  
  // Suspension state
  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false,
    reason: '',
    suspendedAt: null,
    statusHistory: []
  });

  // ✅ Free month state
  const [isFreeMonth, setIsFreeMonth] = useState(false);
  const [freeMonthDescription, setFreeMonthDescription] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // ✅ Check if current month is free
        const free = isCurrentMonthFree();
        setIsFreeMonth(free);
        setFreeMonthDescription(getCurrentFreeMonthDescription());

        // ✅ FETCH VENDOR DATA (Includes plan and status)
        let vendorData = null;
        let planKey = 'STARTER';
        let rate = 8;
        
        try {
          const res = await fetch(`https://api.brandelsuperadmin.starlighttechlabsindia.com/api/customers/vendors/me`, { headers });
          if (res.ok) {
            const data = await res.json();
            vendorData = data.vendor || data;
            console.log("✅ Vendor data:", vendorData);
            
            if (vendorData) {
              setVendorData(vendorData);
              planKey = vendorData.plan || 'STARTER';
              rate = vendorData.commissionRate || vendorData.commission_rate || 8;
              
              // ✅ If free month, override commission to 0
              if (free) {
                rate = 0;
              }
              
              setCommissionRate(rate);
              setVendorPlan(vendorData);
              
              // Set suspension info
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
              planKey = vendorData.plan || 'STARTER';
              rate = vendorData.commissionRate || vendorData.commission_rate || 8;
              if (free) rate = 0;
              setCommissionRate(rate);
            }
          }
        } catch (planErr) {
          console.warn("Plan fetch error:", planErr.message);
        }

        // ✅ Get plan details
        const planDetails = getPlanDetails(planKey);
        console.log("📋 Plan Details:", planDetails);

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
        const rateFinal = commissionRate || 8;
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
            title: free ? `Admin Commission (0% - Free Month)` : `Admin Commission (${rateFinal}%)`,
            value: free ? `₹0` : `₹${totalAdminPay.toLocaleString("en-IN")}`,
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
      'STARTER': <FaRocket className="me-2" />,
      'GROWTH': <FaChartLine className="me-2" />,
      'PREMIUM': <FaCrown className="me-2" />,
      'founding': <FaRocket className="me-2" />
    };
    return icons[plan] || <FaInfoCircle className="me-2" />;
  };

  const getPlanColor = (plan) => {
    if (!plan) return 'secondary';
    const colors = {
      'STARTER': 'secondary',
      'GROWTH': 'primary',
      'PREMIUM': 'warning',
      'founding': 'success'
    };
    return colors[plan] || 'secondary';
  };

  const getPlanName = (plan) => {
    if (!plan) return 'No Plan';
    const names = {
      'STARTER': 'STARTER',
      'GROWTH': 'GROWTH',
      'PREMIUM': 'PREMIUM',
      'founding': 'Founding 100'
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
  const planKey = vendorPlan?.plan || 'STARTER';
  const planDetails = getPlanDetails(planKey);

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

            {/* 🎉 FREE MONTH ALERT */}
            {isFreeMonth && !suspensionInfo.isSuspended && (
              <Alert variant="success" className="mb-4">
                <div className="d-flex align-items-start">
                  <FaRocket className="me-3 mt-1" style={{ fontSize: '32px' }} />
                  <div>
                    <h5 className="mb-1">🎉 {freeMonthDescription || 'Free Month Offer!'}</h5>
                    <p className="mb-0">
                      <strong>0% Commission</strong> on all your sales during this month!
                      <br />
                      <small className="text-muted">Normal commission will resume from next month.</small>
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            {/* 📅 Upcoming Free Months */}
            {!isFreeMonth && !suspensionInfo.isSuspended && (
              <Alert variant="info" className="mb-4">
                <div className="d-flex align-items-start">
                  <FaCalendarAlt className="me-3 mt-1" style={{ fontSize: '28px' }} />
                  <div>
                    <h6 className="mb-1">📅 Upcoming Free Months</h6>
                    <ul className="mb-0 ps-3">
                      {FREE_MONTHS.map((fm, idx) => (
                        <li key={idx}>
                          <strong>{fm.month}</strong> - {fm.description}
                        </li>
                      ))}
                    </ul>
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
                <Card className={`plan-card-detailed ${suspensionInfo.isSuspended ? 'border-danger opacity-50' : ''}`}>
                  <Card.Body>
                    <Row>
                      <Col lg={4}>
                        <div className="d-flex align-items-center">
                          <div 
                            className="plan-icon-wrapper"
                            style={{ 
                              backgroundColor: `${planDetails.color}20`,
                              color: planDetails.color,
                              width: '60px',
                              height: '60px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '28px'
                            }}
                          >
                            {getPlanIcon(planKey)}
                          </div>
                          <div className="ms-3">
                            <h5 className="mb-0" style={{ color: planDetails.color }}>
                              {planDetails.name}
                            </h5>
                            <div className="d-flex gap-2 mt-1 flex-wrap">
                              <Badge bg={getPlanColor(planKey)} pill>
                                {planKey.toUpperCase()}
                              </Badge>
                              <Badge 
                                bg={isFreeMonth ? 'success' : 'info'} 
                                pill
                              >
                                {isFreeMonth ? '🎉 0% Commission' : `Commission: ${planDetails.commissionRate}%`}
                              </Badge>
                              <Badge 
                                style={{ 
                                  backgroundColor: planDetails.bgColor,
                                  color: planDetails.color,
                                  border: `1px solid ${planDetails.color}`
                                }}
                                pill
                              >
                                <FaRupeeSign size={10} /> {planDetails.monthlyFee.toLocaleString()}/mo
                              </Badge>
                              <Badge bg={suspensionInfo.isSuspended ? 'danger' : (vendorData?.status === 'active' ? 'success' : 'warning')} pill>
                                {suspensionInfo.isSuspended ? '🚫 SUSPENDED' : (vendorData?.status || 'active').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col lg={8}>
                        <Row>
                          <Col md={6}>
                            <div className="plan-description">
                              <small className="text-muted">{planDetails.description}</small>
                              {isFreeMonth && (
                                <div className="mt-1">
                                  <Badge bg="success" style={{ fontSize: '12px' }}>
                                    🎉 0% Commission Active
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="plan-features-preview">
                              <small className="text-muted d-block mb-1">Features:</small>
                              <div className="d-flex flex-wrap gap-1">
                                {planDetails.features.slice(0, 3).map((feature, idx) => (
                                  <span key={idx} className="feature-tag">
                                    <FaCheckCircle size={10} className="me-1" style={{ color: planDetails.color }} />
                                    <small>{feature}</small>
                                  </span>
                                ))}
                                {planDetails.features.length > 3 && (
                                  <span className="feature-tag text-muted">
                                    <small>+{planDetails.features.length - 3} more</small>
                                  </span>
                                )}
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
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
                          <h5 className="mb-3">
                            {isFreeMonth ? 'Admin Commission (0% - Free Month)' : 'Admin Earnings (Monthly)'}
                          </h5>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={adminCommissionData.length > 0 ? adminCommissionData : [{ month: 'No Data', commission: 0 }]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="month" stroke="#888" fontSize={12} />
                              <YAxis stroke="#888" fontSize={12} />
                              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                              <Line type="monotone" dataKey="commission" stroke={isFreeMonth ? '#28a745' : '#FF9800'} strokeWidth={3} dot={{ fill: isFreeMonth ? '#28a745' : '#FF9800', r: 4 }} />
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
                              <th>Commission ({isFreeMonth ? '0%' : (commissionRate || 8) + '%'})</th>
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
                                  <td className="text-warning">
                                    {isFreeMonth ? (
                                      <Badge bg="success">₹0</Badge>
                                    ) : (
                                      `₹${Number(item.adminCommission || item.commission || 0).toFixed(2)}`
                                    )}
                                  </td>
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