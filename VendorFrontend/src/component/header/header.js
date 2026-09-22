import React, { useState, useEffect } from "react";
import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaBars, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import "./header.css";

const Header = () => {
  const navigate = useNavigate();

  // 🆕 Login state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorCompany, setVendorCompany] = useState("");

  // 🆕 Check login state on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("vendorName");
      const company = localStorage.getItem("vendorCompany");
      setIsLoggedIn(!!token);
      setVendorName(name || "");
      setVendorCompany(company || "");
    };

    checkAuth();

    // Multi-tab support (logout from one tab → others detect)
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  // 🆕 Logout handler
  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem("token");
    localStorage.removeItem("vendorId");
    localStorage.removeItem("vendorName");
    localStorage.removeItem("vendorCompany");
    localStorage.removeItem("role");

    setIsLoggedIn(false);
    setVendorName("");
    setVendorCompany("");

    navigate("/login");
  };

  return (
    <div>
      <div>
        <motion.div
          className="header-motion"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { y: -80, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Navbar expand="lg" className="main-header">
            <Container fluid>
              {/* Mobile Toggle */}
              <Navbar.Toggle aria-controls="nav-menu" className="menu-toggle">
                <FaBars />
              </Navbar.Toggle>

              {/* Menu */}
              <Navbar.Collapse id="nav-menu">
                <Nav className="ms-auto nav-links">
                  <Nav.Link href="/dashboard">Dashboard</Nav.Link>
                  <Nav.Link href="/product">Products</Nav.Link>
                  <Nav.Link href="/order">Orders</Nav.Link>
                  <Nav.Link href="/customer">Customers</Nav.Link>

                  {/* 🆕 Auth Section */}
                  {isLoggedIn ? (
                    <NavDropdown
                      title={
                        <span className="vendor-name-display">
                          <FaUserCircle size={18} />
                          {vendorName || "Vendor"}
                        </span>
                      }
                      id="vendor-dropdown"
                      align="end"
                    >
                      <NavDropdown.Header>
                        <div style={{ fontSize: "13px" }}>
                          <strong>{vendorName || "Vendor"}</strong>
                          {vendorCompany && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#666",
                                marginTop: "2px",
                              }}
                            >
                              {vendorCompany}
                            </div>
                          )}
                        </div>
                      </NavDropdown.Header>
                      <NavDropdown.Divider />
                      <NavDropdown.Item
                        onClick={handleLogout}
                        className="logout-dropdown-item"
                      >
                        <FaSignOutAlt style={{ marginRight: "8px" }} />
                        Logout
                      </NavDropdown.Item>
                    </NavDropdown>
                  ) : (
                    <Nav.Link
                      as={Link}
                      to="/login"
                      className="nav-link-login"
                    >
                      Login
                    </Nav.Link>
                  )}
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>
        </motion.div>
      </div>
    </div>
  );
};

export default Header;