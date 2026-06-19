import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// Pages
import Dashboard from './pages/dashboard/dashboard';
import VendorRegister from './pages/signin/signin';
import Login from './pages/login/login';
import Product from './pages/product/product';
import Categories from './pages/Categories/Categories';
import Order from './pages/order/order';
import Delivery from './pages/delivery/delivery';
import Customer from './pages/customer/customer';
// import Payment from './pages/payment/payment';

// NEW PAGES
import Coupon from './pages/Coupon/Coupon';
import Notification from './pages/Notification/Notification';
import Review from './pages/Review/Review';
import Settings from './pages/Settings/Settings';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router basename="/">
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/VendorRegister" element={<VendorRegister />} />
      
      {/* Main Routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/product" element={<Product />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/order" element={<Order />} />
      <Route path="/delivery" element={<Delivery />} />
      <Route path="/customer" element={<Customer />} />
      
      {/* NEW ROUTES */}
      <Route path="/coupon" element={<Coupon />} />
      <Route path="/notification" element={<Notification />} />
      <Route path="/review" element={<Review />} />
      <Route path="/settings" element={<Settings />} />
      
      {/* Payment (Commented) */}
      {/* <Route path="/payment" element={<Payment />} /> */}
    </Routes>
  </Router>
);

reportWebVitals();