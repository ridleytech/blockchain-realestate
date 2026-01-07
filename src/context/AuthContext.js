import React, { createContext, useState, useEffect, useContext } from "react";

const API_URL = "http://localhost:4000";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      } else {
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different types of errors
        if (response.status === 401) {
          throw new Error(data.message || "Invalid email or password");
        } else if (response.status === 400) {
          throw new Error(data.message || "Invalid request");
        } else {
          throw new Error(data.message || "Login failed. Please try again.");
        }
      }

      if (!data.token) {
        throw new Error("No authentication token received");
      }

      localStorage.setItem("token", data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      setCurrentUser(data.user);
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setError(null);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
    error,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
