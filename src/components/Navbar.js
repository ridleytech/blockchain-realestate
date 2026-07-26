import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Navbar as BSNavbar,
  Nav,
  Container,
  Button,
  NavDropdown,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

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
            <Nav.Link
              as={Link}
              to="/how-it-works"
              active={location.pathname === "/how-it-works"}
            >
              How It Works
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/about"
              active={location.pathname === "/about"}
            >
              About
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/contact"
              active={location.pathname === "/contact"}
            >
              Contact
            </Nav.Link>
          </Nav>
          <div className="d-flex">
            {loading ? (
              <div className="d-flex align-items-center">
                <div className="spinner-border text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : currentUser ? (
              <>
                <NavDropdown
                  title={
                    <>
                      <i className="fas fa-user-circle me-1"></i>
                      {currentUser.name || "Account"}
                    </>
                  }
                  id="user-dropdown"
                  align="end"
                >
                  <NavDropdown.Item as={Link} to="/profile">
                    <i className="fas fa-user me-2"></i>Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/my-properties">
                    <i className="fas fa-home me-2"></i>My Properties
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>Logout
                  </NavDropdown.Item>
                </NavDropdown>
                <Button
                  variant="outline-light"
                  className="ms-2"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline-light"
                  className="me-2"
                  as={Link}
                  to="/login"
                >
                  Login
                </Button>
                <Button variant="primary" as={Link} to="/register">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
