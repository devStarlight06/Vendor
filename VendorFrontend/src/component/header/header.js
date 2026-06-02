import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { motion } from "framer-motion";
import { FaBars } from "react-icons/fa";
import "./header.css";

const Header = () => {
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
              {/* Logo */}
              <Navbar.Brand href="/" className="brand">
                <img src="/images/image.png" alt="Logo" className="brand-logo" />
              </Navbar.Brand>

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
                  {/* <Nav.Link href="/settings">Settings</Nav.Link> */}
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
