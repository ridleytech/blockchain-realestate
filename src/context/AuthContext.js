import React, { createContext, useState, useEffect, useContext } from "react";

const API_URL = "http://localhost:4000";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    console.log("Starting auth check...");
    try {
      const token = localStorage.getItem("token");
      console.log("Token from localStorage:", token ? "exists" : "missing");

      if (!token) {
        console.log("No token found, user is not authenticated");
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      console.log("Verifying token with backend...");
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        mode: "cors",
      });

      const responseData = await response.json();
      console.log("Auth check response:", {
        status: response.status,
        data: responseData,
      });

      if (response.ok && responseData.success) {
        const userData = responseData.data;
        console.log("User data from /me:", userData);

        if (userData && userData._id) {
          console.log("Setting current user:", userData.email);
          setCurrentUser({
            id: userData._id,
            name: userData.name,
            email: userData.email,
            walletAddress: userData.walletAddress,
            role: userData.role || "user",
          });
        } else {
          console.error("Invalid user data received:", userData);
          console.log("Removing invalid token from localStorage");
          localStorage.removeItem("token");
          setCurrentUser(null);
        }
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to verify token (${response.status}):`,
          errorText
        );
        console.log("Removing token due to verification failure");
        localStorage.removeItem("token");
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      console.log("Removing token due to error");
      localStorage.removeItem("token");
      setCurrentUser(null);
    } finally {
      console.log("Auth check complete, setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      console.log("Attempting to log in with:", { email });

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
        mode: "cors",
      });

      const data = await response.json();
      console.log("Login response:", { status: response.status, data });

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

      // The token might be in data.token or data.data.token
      const token = data.token || (data.data && data.data.token);

      if (!token) {
        console.error("No token in response:", data);
        throw new Error("No authentication token received");
      }

      // Store the token in localStorage
      localStorage.setItem("token", token);
      console.log("Token stored in localStorage");

      // Get the user data from the response or fetch it
      let userData = data.user || data.data?.user;

      // If we don't have complete user data, fetch it
      if (!userData || !userData._id) {
        console.log("Fetching user data from /me endpoint");
        try {
          const userResponse = await fetch(`${API_URL}/api/auth/me`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            mode: "cors",
          });

          if (!userResponse.ok) {
            const errorData = await userResponse.json();
            console.error("Error from /me endpoint:", errorData);
            throw new Error(errorData.message || "Failed to fetch user data");
          }

          const responseData = await userResponse.json();
          userData = responseData.data; // Extract the user data from the response
          console.log("User data from /me:", userData);
        } catch (error) {
          console.error("Error fetching user data:", error);
          throw error;
        }
      }

      // Set the current user with the retrieved data
      if (userData && userData._id) {
        const user = {
          id: userData._id,
          name: userData.name,
          email: userData.email,
          walletAddress: userData.walletAddress,
          role: userData.role || "user",
        };
        setCurrentUser(user);
        console.log("User set in context:", user);
        return { success: true, user };
      } else {
        throw new Error("Failed to load user data");
      }
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
