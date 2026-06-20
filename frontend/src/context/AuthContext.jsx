import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutTimer, setLogoutTimer] = useState(null);

  const clearLogoutTimer = () => {
    if (logoutTimer) {
      clearTimeout(logoutTimer);
      setLogoutTimer(null);
    }
  };

  const decodeTokenExpiry = (jwtToken) => {
    try {
      const payloadSegment = jwtToken.split(".")[1];
      const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(paddedBase64));
      return payload.exp ? payload.exp * 1000 : null;
    } catch (error) {
      return null;
    }
  };

  const scheduleLogout = (jwtToken) => {
    clearLogoutTimer();

    const expiryTime = decodeTokenExpiry(jwtToken);
    if (!expiryTime) return;

    const delay = Math.max(expiryTime - Date.now(), 0);
    const timerId = setTimeout(() => {
      logout();
    }, delay);

    setLogoutTimer(timerId);
  };

  // Check if user is already logged in on app load
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (!savedToken || !savedUser) {
        if (isMounted) setLoading(false);
        return;
      }

      const expiryTime = decodeTokenExpiry(savedToken);
      if (!expiryTime || expiryTime <= Date.now()) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (!isMounted) return;

        const userData = response.data || JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
        scheduleLogout(savedToken);
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (isMounted) {
          clearLogoutTimer();
          delete axios.defaults.headers.common["Authorization"];
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      isMounted = false;
      axios.interceptors.response.eject(responseInterceptor);
      clearLogoutTimer();
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      setToken(token);
      setUser(userData);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      scheduleLogout(token);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || "Login failed",
      };
    }
  };

  // Signup function
  const signup = async (name, email, password, role) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup `, {
        name,
        email,
        password,
        role,
      });

      // If signup is successful and there's user data, auto-login
      if (response.data.user && response.data.token) {
        const { token, user: userData } = response.data;
        setToken(token);
        setUser(userData);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        scheduleLogout(token);

        return {
          success: true,
          message: response.data.msg || "Account created successfully",
          user: userData,
          autoLogin: true,
        };
      }

      return {
        success: true,
        message: response.data.msg || "Account created successfully",
        user: response.data.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || "Signup failed",
      };
    }
  };

  // Logout function
  const logout = () => {
    clearLogoutTimer();
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
  };

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
