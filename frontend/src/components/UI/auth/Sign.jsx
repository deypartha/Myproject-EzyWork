import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Briefcase, ArrowRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const Sign = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { login, signup, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(user.role === "worker" ? "/worker" : "/user");
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return false;
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (isSignUp) {
      if (!formData.name) {
        setError("Name is required");
        return false;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isSignUp) {
        // Handle signup
        const result = await signup(
          formData.name,
          formData.email,
          formData.password,
          formData.role
        );

        if (result.success) {
          setSuccess("Account created successfully! Please sign in.");
          // Clear form and switch to login
          setTimeout(() => {
            setIsSignUp(false);
            setFormData({
              name: "",
              email: "",
              password: "",
              confirmPassword: "",
              role: "user",
            });
            setSuccess("");
          }, 2000);
        } else {
          setError(result.error);
        }
      } else {
        // Handle login
        const result = await login(formData.email, formData.password);

        if (result.success) {
          setSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            const role = result.user?.role || "user";
            navigate(role === "worker" ? "/worker" : "/user");
          }, 1500);
        } else {
          setError(result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#f8fafc] via-[#e2e8f0] to-[#f8fafc] dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 text-gray-600 hover:text-gray-800 dark:text-white/70 dark:hover:text-white flex items-center gap-2 transition-colors z-20"
      >
        <ArrowRight className="w-5 h-5 rotate-180" />
        Back to Home
      </button>

      <div className="w-full max-w-md bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isSignUp
              ? "Join us to find the best workers"
              : "Sign in to manage your account"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-200 text-sm text-center flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/50 rounded-lg text-green-700 dark:text-green-200 text-sm text-center flex items-center gap-2 justify-center">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">I am a</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "user" })}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${formData.role === "user"
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10"
                    }`}
                >
                  <User className="w-4 h-4" />
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "worker" })}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${formData.role === "worker"
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10"
                    }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Worker
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1e293b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setFormData({ name: "", email: "", password: "", role: "user" });
              }}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Sign;
