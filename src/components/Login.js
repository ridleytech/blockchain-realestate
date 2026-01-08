import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Form, Button, Alert, Container, Card } from "react-bootstrap";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path or default to home
  const from = location.state?.from?.pathname || "/";

  // Check for success message from registration
  React.useEffect(() => {
    if (location.state?.registrationSuccess) {
      setSuccessMessage("Registration successful! Please log in.");
      // Clear any previous errors
      if (clearError) clearError();

      // Pre-fill email if provided
      if (location.state?.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      // Use the login function from AuthContext which already uses the correct API_URL
      await login(email, password);
      // Redirect to the previous page or home
      navigate(from, { replace: true });
    } catch (error) {
      // Error is already handled in the AuthContext
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "80vh" }}
    >
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Log In</h2>
            {successMessage && (
              <Alert variant="success">{successMessage}</Alert>
            )}
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group id="email" className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </Form.Group>
              <Form.Group id="password" className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </Form.Group>
              <Button disabled={loading} className="w-100" type="submit">
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </Form>
            <div className="w-100 text-center mt-3">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Need an account? <Link to="/register">Sign Up</Link>
        </div>
      </div>
    </Container>
  );
};

export default Login;
