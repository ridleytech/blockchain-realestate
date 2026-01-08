import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white mt-5 py-4">
      <Container>
        <Row>
          <Col md={4} className="mb-4 mb-md-0">
            <h5>Blockchain Real Estate</h5>
            <p className="text-muted small">
              Revolutionizing real estate investment through blockchain
              technology. Own a piece of prime property with just a few clicks.
            </p>
            <div className="social-links">
              <a href="#" className="text-white me-3">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-white me-3">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" className="text-white me-3">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" className="text-white">
                <i className="fab fa-github"></i>
              </a>
            </div>
          </Col>

          <Col md={2} className="mb-4 mb-md-0">
            <h5>Explore</h5>
            <ul className="list-unstyled small text-center text-md-start">
              <li className="mb-1">
                <Link to="/" className="text-muted d-block">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/properties" className="text-muted d-block">
                  Properties
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-muted d-block">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted d-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted d-block">
                  Contact
                </Link>
              </li>
            </ul>
          </Col>

          <Col md={3} className="mb-4 mb-md-0">
            <h5>Legal</h5>
            <ul className="list-unstyled text-center text-md-start">
              <li>
                <Link to="/privacy" className="text-muted d-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted d-block">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="text-muted d-block">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted d-block">
                  FAQ
                </Link>
              </li>
            </ul>
          </Col>

          <Col md={3}>
            <h5>Contact Us</h5>
            <address className="text-muted">
              <p>
                <i className="fas fa-map-marker-alt me-2"></i>
                123 Blockchain Ave, Crypto City, 10001
              </p>
              <p>
                <i className="fas fa-phone me-2"></i>
                +1 (555) 123-4567
              </p>
              <p>
                <i className="fas fa-envelope me-2"></i>
                info@blockchainrealestate.com
              </p>
            </address>
          </Col>
        </Row>

        <hr className="mt-4 mb-3" />

        <Row>
          <Col md={6} className="text-center text-md-start">
            <p className="mb-0 text-muted">
              &copy; {currentYear} Blockchain Real Estate. All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
