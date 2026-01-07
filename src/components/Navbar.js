import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Navbar as BSNavbar, Nav, Container, Button } from "react-bootstrap";

const Navbar = () => {
  const location = useLocation();

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" className="shadow">
      <Container>
        <BSNavbar.Brand as={Link} to="/" className="fw-bold">
          <i className="fas fa-home me-2"></i>
          Blockchain Real Estate
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" active={location.pathname === "/"}>
              Home
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/properties"
              active={location.pathname.startsWith("/properties")}
            >
              Properties
            </Nav.Link>
            <Nav.Link href="#how-it-works">How It Works</Nav.Link>
            <Nav.Link href="#about">About</Nav.Link>
            <Nav.Link href="#contact">Contact</Nav.Link>
          </Nav>
          <div className="d-flex">
            <Button variant="outline-light" className="me-2" href="/login">
              Login
            </Button>
            <Button variant="primary" href="/register">
              Sign Up
            </Button>
          </div>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
