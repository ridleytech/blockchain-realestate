import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Form, Button, Alert, Container, Card } from "react-bootstrap";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous field errors

    if (password !== confirmPassword) {
      return setError("Passwords don't match");
    }

    try {
      setError("");
      setLoading(true);

      // Register the user
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4000"
        }/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            walletAddress,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const errors = {};
          data.errors.forEach((err) => {
            errors[err.path] = err.msg;
          });
          setFieldErrors(errors);
          throw new Error("Please fix the form errors and try again.");
        }
        throw new Error(data.message || "Registration failed");
      }

      // If registration is successful, log the user in automatically
      try {
        // Use the login function from AuthContext
        const loginResponse = await login(email, password);

        // If login was successful, navigate to home
        if (loginResponse && loginResponse.success) {
          return navigate("/", { replace: true });
        }

        // If we get here, login was successful but something unexpected happened
        throw new Error("Login successful but could not redirect");
      } catch (loginError) {
        console.error("Auto-login failed:", loginError);
        // If auto-login fails, redirect to login page with success message
        navigate("/login", {
          state: {
            email,
            registrationSuccess: true,
          },
        });
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to create an account. Please try again.");
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
            <h2 className="text-center mb-4">Sign Up</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group id="name" className="mb-3">
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    // Clear error when user types
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  isInvalid={!!fieldErrors.name}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.name}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group id="email" className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  isInvalid={!!fieldErrors.email}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.email}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group id="walletAddress" className="mb-3">
                <Form.Label>Ethereum Wallet Address</Form.Label>
                <Form.Control
                  type="text"
                  value={walletAddress}
                  onChange={(e) => {
                    setWalletAddress(e.target.value);
                    if (fieldErrors.walletAddress) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        walletAddress: undefined,
                      }));
                    }
                  }}
                  placeholder="0x..."
                  isInvalid={!!fieldErrors.walletAddress}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.walletAddress}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Must be a valid Ethereum address (starts with 0x and is 42
                  characters long)
                </Form.Text>
              </Form.Group>
              <Form.Group id="password" className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  isInvalid={!!fieldErrors.password}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.password}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Must be at least 6 characters long
                </Form.Text>
              </Form.Group>
              <Form.Group id="confirmPassword" className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isInvalid={!!error && error === "Passwords don't match"}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {error === "Passwords don't match" ? error : ""}
                </Form.Control.Feedback>
              </Form.Group>
              <Button disabled={loading} className="w-100" type="submit">
                Sign Up
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>
    </Container>
  );
};

export default Register;
