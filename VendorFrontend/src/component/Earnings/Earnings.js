import { useEffect, useState } from "react";
import { Container, Table, Card } from "react-bootstrap";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const Earnings = () => {
  const [data, setData] = useState([]);
  const formatPrice = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

  useEffect(() => {
    const fetchEarnings = async () => {
      const res = await fetch("http://localhost:5001/api/orders/my-earnings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const result = await res.json();
      setData(result);
    };
    fetchEarnings();
  }, []);

  // Calculate totals for the summary card
  const totalReceived = data.reduce((sum, item) => sum + item.vendorPayout, 0);

  return (
    <>
      <Header />
      <div className="admin-layout">
        <Sidebar />
        <main className="admin-content">
          <Container fluid>
            <h4>Earnings & Commission (5%)</h4>
            
            <Card className="mb-4 bg-light">
              <Card.Body>
                <h5>Total Payout to Me: <span className="text-success">{formatPrice(totalReceived)}</span></h5>
              </Card.Body>
            </Card>

            <Table responsive bordered hover>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Sale Amount</th>
                  <th>Admin Comm. (5%)</th>
                  <th>My Payout</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.productName}</td>
                    <td>{item.category}</td>
                    <td>{formatPrice(item.totalSales)}</td>
                    <td className="text-danger">-{formatPrice(item.adminCommission)}</td>
                    <td className="text-success"><strong>{formatPrice(item.vendorPayout)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Container>
        </main>
      </div>
    </>
  );
};

export default Earnings;