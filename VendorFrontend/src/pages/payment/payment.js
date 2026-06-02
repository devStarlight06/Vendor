import { useState, useEffect } from "react";
import { Container, Table, Badge, Spinner } from "react-bootstrap";
import { motion } from "framer-motion";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";
import "./payment.css";

/* ---------------- MOCK PAYMENT DATA ---------------- */
const MOCK_PAYMENTS = [
  {
    id: "TXN-10001",
    method: "UPI",
    status: "Success",
    amount: "₹1,299",
    date: "10 Jan 2025",
  },
  {
    id: "TXN-10002",
    method: "Credit Card",
    status: "Pending",
    amount: "₹799",
    date: "08 Jan 2025",
  },
  {
    id: "TXN-10003",
    method: "Net Banking",
    status: "Failed",
    amount: "₹2,150",
    date: "05 Jan 2025",
  },
  {
    id: "TXN-10004",
    method: "Cash on Delivery",
    status: "Success",
    amount: "₹499",
    date: "03 Jan 2025",
  },
];

const Payment = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD MOCK PAYMENTS ---------------- */
  useEffect(() => {
    setTimeout(() => {
      setPayments(MOCK_PAYMENTS);
      setLoading(false);
    }, 800); // fake loading
  }, []);

  const getStatusVariant = (status) => {
    if (status === "Success") return "success";
    if (status === "Pending") return "warning";
    return "danger";
  };

  return (
    <div>
      <Header />
      <Sidebar />

      <div className="admin-layout">
        <main className="admin-content">
          <Container fluid>
            <motion.h4
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              Payments
            </motion.h4>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" /> Loading payments...
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="table-wrapper"
              >
                <Table responsive bordered hover className="payments-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment, index) => (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td>{payment.id}</td>
                        <td>{payment.method}</td>
                        <td>
                          <Badge bg={getStatusVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td>{payment.amount}</td>
                        <td>{payment.date}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </Table>
              </motion.div>
            )}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Payment;
