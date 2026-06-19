import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Form } from "react-bootstrap";
import { motion } from "framer-motion";
import {
  FaRupeeSign,
  FaShoppingCart,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";
import Earnings from "../../component/Earnings/Earnings";
import "./dashboard.css";
const REACT_APP_API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001/api";
const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [adminCommissionData, setAdminCommissionData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        const [ordersRes, earningsRes] = await Promise.all([
          fetch(`${REACT_APP_API_BASE}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${REACT_APP_API_BASE}/orders/my-earnings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setOrders(await ordersRes.json());
        setEarnings(await earningsRes.json());
        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  /* ---------- FILTER & CALCULATIONS ---------- */
  useEffect(() => {
    const filteredOrders =
      selectedMonth === "All"
        ? orders
        : orders.filter(o =>
            new Date(o.createdAt).toLocaleString("en-US", { month: "short" }) ===
            selectedMonth
          );

    const filteredEarnings =
      selectedMonth === "All"
        ? earnings
        : earnings.filter(e =>
            new Date(e.date).toLocaleString("en-US", { month: "short" }) ===
            selectedMonth
          );

    const deliveredOrders = filteredOrders.filter(
      o => o.orderStatus === "Delivered"
    );

    const pendingOrders = filteredOrders.filter(
      o => o.orderStatus === "Pending"
    );

    const cancelledOrders = filteredOrders.filter(
      o => o.orderStatus === "Cancelled"
    );

    const totalSales = earnings.reduce((sum, e) => sum + e.totalSales, 0);

    const monthlySales = filteredEarnings.reduce(
      (sum, e) => sum + e.totalSales,
      0
    );

    const totalAdminPay = earnings.reduce(
      (sum, e) => sum + (e.adminCommission || 0),
      0
    );

    const totalVendorPayout = earnings.reduce(
      (sum, e) => sum + (e.vendorPayout || 0),
      0
    );

    const days =
      new Set(
        deliveredOrders.map(o => new Date(o.createdAt).toDateString())
      ).size || 1;

    setStats([
      {
        title: "Total Earnings (Payout to Me)",
        value: `₹${totalVendorPayout.toLocaleString("en-IN")}`,
        icon: <FaRupeeSign />,
      },
      {
        title: "Total Sales",
        value: `₹${totalSales.toLocaleString("en-IN")}`,
        icon: <FaRupeeSign />,
      },
      {
        title: "Monthly Sales",
        value: `₹${monthlySales.toLocaleString("en-IN")}`,
        icon: <FaRupeeSign />,
      },
      {
        title: "Avg Daily Sales",
        value: `₹${Math.round(monthlySales / days).toLocaleString("en-IN")}`,
        icon: <FaRupeeSign />,
      },
      {
        title: "Admin Earnings (5%)",
        value: `₹${totalAdminPay.toLocaleString("en-IN")}`,
        icon: <FaRupeeSign />,
      },
      {
        title: "Total Orders",
        value: filteredOrders.length,
        icon: <FaShoppingCart />,
      },
      {
        title: "Pending Orders",
        value: pendingOrders.length,
        icon: <FaClock />,
      },
      {
        title: "Cancelled Orders",
        value: cancelledOrders.length,
        icon: <FaTimesCircle />,
      },
    ]);

    /* ---------- SALES CHART ---------- */
    const monthlySalesMap = {};

    earnings.forEach(e => {
      const month = new Date(e.date).toLocaleString("en-US", { month: "short" });
      monthlySalesMap[month] = (monthlySalesMap[month] || 0) + e.totalSales;
    });

    setSalesData(
      Object.keys(monthlySalesMap).map(m => ({
        month: m,
        sales: monthlySalesMap[m],
      }))
    );

    /* ---------- ADMIN COMMISSION CHART ---------- */
    const adminMonthly = {};

    earnings.forEach(e => {
      const month = new Date(e.date).toLocaleString("en-US", { month: "short" });
      adminMonthly[month] =
        (adminMonthly[month] || 0) + (e.adminCommission || 0);
    });

    setAdminCommissionData(
      Object.keys(adminMonthly).map(m => ({
        month: m,
        commission: Math.round(adminMonthly[m]),
      }))
    );
  }, [selectedMonth, orders, earnings]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Loading dashboard...
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="admin-layout">
        <Sidebar />

        <main className="admin-content mt-5">
          <Container fluid>
            <motion.h3 className="mb-4">Dashboard Overview</motion.h3>

            <Form.Select
              className="mb-4 w-25"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="All">All Months</option>
              {[...new Set(
                earnings.map(e =>
                  new Date(e.date).toLocaleString("en-US", { month: "short" })
                )
              )].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </Form.Select>

            <Row className="g-4">
              {stats.map((item, index) => (
                <Col xl={3} lg={4} md={6} xs={12} key={index}>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="stat-card">
                      <div className="stat-icon">{item.icon}</div>
                      <div>
                        <h6>{item.title}</h6>
                        <h4>{item.value}</h4>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>

            <motion.div className="mt-5">
              <Card className="chart-card">
                <h5 className="mb-3">Monthly Sales</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            <motion.div className="mt-5">
              <Card className="chart-card">
                <h5 className="mb-3">Admin Earnings (Monthly)</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={adminCommissionData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={v => `₹${v.toLocaleString("en-IN")}`} />
                    <Line type="monotone" dataKey="commission" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Container>
        </main>
      </div>

      <Earnings />
    </>
  );
};

export default Dashboard;
