import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Users, 
  Briefcase, 
  BarChart3, 
  Edit2, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Phone, 
  Award, 
  ShieldCheck,
  Search,
  Filter
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import API_BASE_URL from "../../../config/api";
import axios from "axios";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    totalWorkers: 0, 
    totalBookings: 0, 
    totalRevenue: 0,
    recentUsers: [],
    recentWorkers: [],
    recentPayments: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // 'edit-user', 'edit-worker'
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin/login");
    }
  }, [user, navigate]);

  // Fetch data on mount and when tab changes
  useEffect(() => {
    if (user?.role === "admin") {
      fetchDashboardData();
    }
  }, [user, activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === "overview") {
        const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard/stats`, { headers });
        setStats(response.data.stats);
      } else if (activeTab === "users") {
        const response = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
        setUsers(response.data.users || []);
      } else if (activeTab === "workers") {
        const response = await axios.get(`${API_BASE_URL}/api/admin/workers`, { headers });
        setWorkers(response.data.workers || []);
      } else if (activeTab === "payments") {
        const response = await axios.get(`${API_BASE_URL}/api/admin/payments`, { headers });
        setPayments(response.data.payments || []);
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleEdit = (item, type) => {
    setEditingId(item._id);
    setModalType(type);
    setFormData({
      ...item,
      skillsInput: Array.isArray(item.skills) ? item.skills.join(", ") : (item.skills || "")
    });
    setShowModal(true);
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this account? This action cannot be undone.")) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = type === "user" ? "users" : "workers";
      await axios.delete(`${API_BASE_URL}/api/admin/${endpoint}/${id}`, { headers });
      setSuccess("Account deleted successfully!");
      fetchDashboardData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to delete");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = modalType === "edit-user" ? "users" : "workers";

      const payload = { ...formData };
      if (modalType === "edit-worker" && formData.skillsInput) {
        payload.skills = formData.skillsInput.split(",").map(s => s.trim()).filter(Boolean);
      }

      await axios.put(`${API_BASE_URL}/api/admin/${endpoint}/${editingId}`, payload, { headers });
      setSuccess("Details updated successfully!");
      setShowModal(false);
      setEditingId(null);
      fetchDashboardData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to update details");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkers = workers.filter(w => 
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(w.skills) && w.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const filteredPayments = payments.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.createdBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.paymentStatus?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-600/30">
              E
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                EzyWork Admin Portal <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </h1>
              <p className="text-xs text-slate-400">Authenticated Administrator: <span className="text-blue-400 font-medium">{user?.name || "Admin"}</span></p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl transition font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center gap-3 text-rose-300 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-4">
          <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => { setActiveTab("overview"); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === "overview"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === "users"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Users className="w-4 h-4" />
              User Profiles
            </button>
            <button
              onClick={() => { setActiveTab("workers"); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === "workers"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Worker Profiles
            </button>
            <button
              onClick={() => { setActiveTab("payments"); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === "payments"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Payment & Revenue
            </button>
          </div>

          {/* Search Bar for list tabs */}
          {activeTab !== "overview" && (
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-400 mt-3 text-sm">Synchronizing Admin Database...</p>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && !loading && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Customers</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{stats.totalUsers}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Verified Workers</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{stats.totalWorkers}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Briefcase className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Service Bookings</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{stats.totalBookings || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Revenue</p>
                    <p className="text-3xl font-extrabold text-amber-400 mt-2">₹{stats.totalRevenue || 0}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Users */}
              <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                  <span>Recently Registered Users</span>
                  <button onClick={() => setActiveTab("users")} className="text-xs text-blue-400 hover:underline">View All</button>
                </h3>
                <div className="space-y-3">
                  {(!stats.recentUsers || stats.recentUsers.length === 0) ? (
                    <p className="text-slate-500 text-sm py-4 text-center">No recent users registered.</p>
                  ) : (
                    stats.recentUsers.map(u => (
                      <div key={u._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Workers */}
              <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                  <span>Recently Joined Workers</span>
                  <button onClick={() => setActiveTab("workers")} className="text-xs text-blue-400 hover:underline">View All</button>
                </h3>
                <div className="space-y-3">
                  {(!stats.recentWorkers || stats.recentWorkers.length === 0) ? (
                    <p className="text-slate-500 text-sm py-4 text-center">No recent workers registered.</p>
                  ) : (
                    stats.recentWorkers.map(w => (
                      <div key={w._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                            {w.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{w.name}</p>
                            <p className="text-xs text-slate-400">{w.email} • <span className="text-emerald-400">{Array.isArray(w.skills) ? w.skills.join(", ") : (w.skills || "Worker")}</span></p>
                          </div>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Active</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS TAB */}
        {activeTab === "users" && !loading && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Registered Customer Profiles</h3>
                <p className="text-xs text-slate-400">Manage all registered user accounts, profiles, and permissions.</p>
              </div>
              <span className="text-xs px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 font-semibold">
                Total Users: {filteredUsers.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Customer Details</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        No user accounts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{u.name}</p>
                              <p className="text-xs text-slate-500">ID: #{u._id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                            {u.role || "User"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                          {new Date(u.createdAt || Date.now()).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(u, "edit-user")}
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u._id, "user")}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. WORKERS TAB */}
        {activeTab === "workers" && !loading && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Verified Skilled Workers & Technicians</h3>
                <p className="text-xs text-slate-400">View and update worker profiles, assigned skills, contact info, and status.</p>
              </div>
              <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-semibold">
                Total Workers: {filteredWorkers.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Technician Name</th>
                    <th className="px-6 py-4">Contact & Email</th>
                    <th className="px-6 py-4">Specialized Skills</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Experience</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                        No worker profiles found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((w) => (
                      <tr key={w._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                              {w.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white flex items-center gap-1.5">
                                {w.name}
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              </p>
                              <p className="text-xs text-slate-500">ID: #{w._id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-300">{w.email}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" /> {w.number || "Not specified"}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(w.skills) && w.skills.length > 0 ? (
                              w.skills.map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-medium">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">General Technician</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {w.location || "Available City-wide"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-xs font-medium">
                          {w.yearsOfExperience ? `${w.yearsOfExperience} Years Exp.` : "Verified Pro"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(w, "edit-worker")}
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                              title="Edit Worker Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(w._id, "worker")}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Delete Worker Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PAYMENTS & FINANCIALS TAB */}
        {activeTab === "payments" && !loading && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Payment Transactions & Service Bookings</h3>
                <p className="text-xs text-slate-400">Comprehensive ledger of completed and pending customer transactions.</p>
              </div>
              <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-semibold">
                Total Transactions: {filteredPayments.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Service / Booking Title</th>
                    <th className="px-6 py-4">Customer Details</th>
                    <th className="px-6 py-4">Assigned Expert</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                        No payment or service booking records found.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-semibold text-white">{p.title}</p>
                          <p className="text-xs text-slate-500">Category: {p.category || "General"}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-300 font-medium">{p.createdBy?.name || "Customer"}</p>
                          <p className="text-xs text-slate-500">{p.createdBy?.email || "N/A"}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-300 font-medium">{p.assignedTo?.name || "Unassigned"}</p>
                          <p className="text-xs text-emerald-400">{p.assignedTo?.skills?.join(", ") || ""}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-bold text-amber-400">₹{p.amount || 350}</p>
                          <p className="text-[11px] text-slate-500">{p.paymentMethod || "Razorpay"}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            p.paymentStatus === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {p.paymentStatus === "completed" ? "✓ Completed" : "⚡ Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                          {new Date(p.createdAt || Date.now()).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal Component */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                Edit {modalType.includes("user") ? "User Profile" : "Worker Profile"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {modalType === "edit-user" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </>
              )}

              {modalType === "edit-worker" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Worker Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      name="number"
                      value={formData.number || ""}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Specialized Skills (Comma Separated)</label>
                    <input
                      type="text"
                      name="skillsInput"
                      value={formData.skillsInput || ""}
                      onChange={handleFormChange}
                      placeholder="Plumber, Electrician, Carpenter"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location / City</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location || ""}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Years Experience</label>
                      <input
                        type="number"
                        name="yearsOfExperience"
                        value={formData.yearsOfExperience || ""}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/30"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
