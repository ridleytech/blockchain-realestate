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
            <p className="text-muted">
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
            <ul className="list-unstyled">
              <li>
                <Link to="/" className="text-muted">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/properties" className="text-muted">
                  Properties
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-muted">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted">
                  Contact
                </Link>
              </li>
            </ul>
          </Col>

          <Col md={3} className="mb-4 mb-md-0">
            <h5>Legal</h5>
            <ul className="list-unstyled">
              <li>
                <Link to="/privacy" className="text-muted">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="text-muted">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted">
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
          <Col md={6} className="text-center text-md-end">
            <p className="mb-0 text-muted">
              Made with <i className="fas fa-heart text-danger"></i> for the
              future of real estate
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
