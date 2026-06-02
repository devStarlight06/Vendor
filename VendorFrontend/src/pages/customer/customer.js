import { useEffect, useState } from "react";
import { Container, Table, Spinner } from "react-bootstrap";
import { motion } from "framer-motion";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";
import "./customer.css";

/* ---------------- MOCK CUSTOMERS ---------------- */


const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD MOCK DATA ---------------- */
 useEffect(() => {
  const fetchCustomers = async () => {
    const res = await fetch("http://localhost:5001/api/orders/my-customers", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json();
    setCustomers(data);
    setLoading(false);
  };

  fetchCustomers();
}, []);


  return (
    <div>
      <Header />

      <div className="admin-layout">
        <Sidebar />

        <main className="admin-content mt-5">
          <Container fluid>
            <motion.h4
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              Customers
            </motion.h4>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" /> Loading customers...
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="table-wrapper"
              >
                <Table responsive bordered hover className="customers-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Total Orders</th>
                      <th>Total Spend</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.map((customer, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td>{customer.name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.phone}</td>
                        <td>{customer.orders}</td>
                        <td>{customer.spend}</td>
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

export default Customer;
