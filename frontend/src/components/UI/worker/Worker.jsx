import React, { useState, useEffect, useRef } from "react"; // Added useRef
import { io } from "socket.io-client"; // Added socket.io-client
import { useAuth } from "../../../context/AuthContext"; // Added useAuth
import API_BASE_URL from "../../../config/api";
import {
  Users,
  User,
  Wallet,
  Star,
  Calendar,
  ShieldAlert,
  LogOut,
  TrendingUp,
  Briefcase,
  Bell,
  Award,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Settings,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { validOtp } from "../../../utils/otp.validator"

const STATUS_COLORS = {
  open: "#64748b",
  requested: "#f59e0b",
  assigned: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS = {
  open: "Open",
  requested: "Requested",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CATEGORY_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#14b8a6", "#0ea5e9"];

const normalizeSkillList = (skills) => {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  return skills ? [skills] : [];
};

const getPrimaryWorkerCategory = (skills) => normalizeSkillList(skills)[0] || "";

const getPaidEarnings = (jobs = []) =>
  jobs.reduce((total, job) => {
    if (job.paymentStatus !== "completed") return total;
    return total + Number(job.amount || 0);
  }, 0);

const formatDateTime = (value) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
};

const buildStatusData = (jobs = []) => {
  const counts = {
    open: 0,
    requested: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  jobs.forEach((job) => {
    if (counts[job.status] !== undefined) {
      counts[job.status] += 1;
    }
  });

  return Object.keys(counts).map((status) => ({
    name: STATUS_LABELS[status],
    value: counts[status],
    fill: STATUS_COLORS[status],
  }));
};

const buildCategoryData = (jobs = []) => {
  const counts = jobs.reduce((acc, job) => {
    const category = job.category || job.title || "Unknown";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

const getPaymentState = (job = {}) => {
  if (job.status !== "completed") {
    return {
      label: job.paymentStatus === "completed" ? "Payment done" : "Payment pending",
      tone: job.paymentStatus === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700",
    };
  }

  if (job.paymentStatus === "completed") {
    return {
      label: "Payment done",
      tone: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "Payment pending",
    tone: "bg-amber-100 text-amber-700",
  };
};

// --- Utility small components ---
function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className || "bg-gray-100 text-gray-800"}`}>
      {children}
    </span>
  );
}

// --- Main Dashboard ---
export default function WorkerDashboard() {
  const [activeSection, setActiveSection] = useState("job");
  const [online, setOnline] = useState(false);
  const [history, setHistory] = useState([]);
  const [otpModal, setOtpModal] = useState({ open: false, jobId: null });
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState({ open: false, message: "" });
  const [upiId, setUpiId] = useState("");
  const [fraudReportOpen, setFraudReportOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [workerLocation, setWorkerLocation] = useState({
    latitude: null,
    longitude: null,
    city: null,
    country: null,
  });
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const { user } = useAuth(); // Get user from auth
  const [workerProfile, setWorkerProfile] = useState(null); // Store full worker profile
  const [workerRecord, setWorkerRecord] = useState(null); // Actual worker document reference
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null); // Socket reference
  const [assignedProblems, setAssignedProblems] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(false); // Trigger FindWorkSection refresh
  const workerId = workerRecord?._id;

  // Initialize Socket
  useEffect(() => {
    const s = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    setSocket(s);
    socketRef.current = s;

    s.on("connect", () => {
      console.log("Socket connected! ID:", s.id);
    });

    s.on("disconnect", (reason) => {
      console.log("Socket disconnected! Reason:", reason);
    });

    s.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Join rooms on connect/reconnect/worker details change
  useEffect(() => {
    if (!socket) return;

    const joinWorkerRooms = () => {
      const rooms = new Set();
      if (workerRecord?._id) rooms.add(`worker-${workerRecord._id}`);
      if (user?.id) rooms.add(`worker-${user.id}`);
      if (user?._id) rooms.add(`worker-${user._id}`);

      const workerEmail = workerProfile?.email || user?.email;
      if (workerEmail) rooms.add(`worker-email-${workerEmail}`);

      if (workerProfile?.typeOfWork) {
        if (Array.isArray(workerProfile.typeOfWork)) {
          workerProfile.typeOfWork.forEach((skill) => rooms.add(skill));
        } else {
          rooms.add(workerProfile.typeOfWork);
        }
      }

      rooms.forEach((room) => {
        socket.emit("join-room", room);
        console.log("Worker joined room:", room);
      });
    };

    if (socket.connected) {
      joinWorkerRooms();
    }

    socket.on("connect", joinWorkerRooms);
    return () => {
      socket.off("connect", joinWorkerRooms);
    };
  }, [socket, user?.id, user?._id, user?.email, workerRecord?._id, workerProfile?.email, workerProfile?.typeOfWork]);

  // Fetch Worker Profile to get Skills and Registered Location
  useEffect(() => {
    if (!user) return;

    const fetchWorkerProfile = async () => {
      try {
        let response = await fetch(`${API_BASE_URL}/api/workers/${user.id || user._id}`);
        let data = null;

        if (response.ok) {
          data = await response.json();
        } else {
          const allWorkersRes = await fetch(`${API_BASE_URL}/api/workers/all`);
          if (allWorkersRes.ok) {
            const allWorkers = await allWorkersRes.json();
            data = allWorkers.find((worker) => worker.email === user.email);
          }
        }

        if (data) {
          setWorkerProfile(data);
          setWorkerRecord(data);
          if (data.location) {
            setManualCity(data.location);
            setWorkerLocation((prev) => ({
              ...prev,
              city: data.location,
              country: "India",
            }));
          }
          // Automatically set worker online on dashboard load
          try {
            await fetch(`${API_BASE_URL}/api/workers/toggle-online`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: data.email || user.email,
                isOnline: true,
                location: data.location ? { city: data.location } : null,
              }),
            });
            setOnline(true);
            console.log("Worker marked online automatically on dashboard mount");
          } catch (err) {
            console.warn("Failed to automatically mark worker online on load:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching worker profile:", error);
      }
    };

    fetchWorkerProfile();
  }, [user]);

  // Fetch assigned problems
  const fetchAssignedProblems = async () => {
    if (!workerId) {
      setAssignedProblems([]);
      setHistory([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/worker/${workerId}`);
      if (res.ok) {
        const problems = await res.json();
        setAssignedProblems(problems);
        setHistory(problems);
      }
    } catch (err) {
      console.error("Failed to fetch assigned problems:", err);
    }
  };

  useEffect(() => {
    fetchAssignedProblems();
    const interval = setInterval(fetchAssignedProblems, 5000);
    return () => clearInterval(interval);
  }, [workerId]);

  useEffect(() => {
    setWalletBalance(getPaidEarnings(assignedProblems));
  }, [assignedProblems]);

  // Handle Online Toggle
  const handleToggleOnline = async () => {
    const newStatus = !online;
    // Optimistic update
    setOnline(newStatus);

    if (!user) return;

    try {
      // 1. Update Backend
      const res = await fetch(`${API_BASE_URL}/api/workers/toggle-online`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          isOnline: newStatus,
          location: workerLocation
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // 2. Socket Join/Leave Room
      // We need the worker's category/skills. 
      // Since we don't have them in state easily, let's hardcode or fetch.
      // For this demo, I will assume the user has a "category" or "skill" in their profile 
      // or we send *all* their skills.
      // Let's assume we want to join rooms for "Plumber", "Electrician" etc.
      // If we don't have profile, we can't join specific rooms.
      // Let's join a generic "workers" room for now, or assume "Plumber" for testing if missing.

      const skills = normalizeSkillList(workerProfile?.typeOfWork);
      const workerSkills = skills.length ? skills : ["Plumber", "Electrician", "Painter"]; // Fallback

      if (newStatus) {
        workerSkills.forEach(skill => {
          socketRef.current.emit("join-room", skill);
          console.log("Joined room:", skill);
        });
      } else {
        workerSkills.forEach(skill => {
          socketRef.current.emit("leave-room", skill);
        });
      }

    } catch (err) {
      console.error("Failed to toggle online:", err);
      // Revert on failure
      setOnline(!newStatus);
      alert("Failed to update status");
    }
  };

  // Listen for New Problems
  useEffect(() => {
    if (!socket) return;

    const handleNewProblem = (problem) => {
      console.log("New Problem Received:", problem);
      // Play notification sound?
      alert(`New Job Alert: ${problem.title}`);

      // Trigger FindWorkSection refresh by toggling refreshTrigger
      setRefreshTrigger(prev => !prev);
      fetchAssignedProblems();
    };

    socket.on("new-problem", handleNewProblem);
    return () => {
      socket.off("new-problem", handleNewProblem);
    };
  }, [socket, workerId]);

  // Listen for Worker Requests
  useEffect(() => {
    if (!socket) return;

    const handleWorkerRequest = (data) => {
      console.log("Worker Request Received:", data);
      alert(`New Job Request: ${data.problem.title}`);

      // Refresh assigned problems to show the request
      fetchAssignedProblems();
      setRefreshTrigger((prev) => !prev);
    };

    const handleRealtimeProblemUpdate = (data) => {
      fetchAssignedProblems();
      setRefreshTrigger((prev) => !prev);

      if (data?.problem?.paymentStatus === "completed") {
        setPaymentSuccess({
          open: true,
          message: data.message || "Customer payment completed. Your wallet has been updated.",
        });
      }
    };

    socket.on("worker-request", handleWorkerRequest);
    socket.on("payment-updated", handleRealtimeProblemUpdate);
    socket.on("job-status-updated", handleRealtimeProblemUpdate);

    return () => {
      socket.off("worker-request", handleWorkerRequest);
      socket.off("payment-updated", handleRealtimeProblemUpdate);
      socket.off("job-status-updated", handleRealtimeProblemUpdate);
    };
  }, [socket, workerId]);

  // Define menuItems array
  const menuItems = [
    { key: "job", icon: <Users size={18} />, label: "Job Management" },
    { key: "wallet", icon: <Wallet size={18} />, label: "Wallet & Earnings" },
    { key: "performance", icon: <Star size={18} />, label: "Performance Analytics" },
    { key: "availability", icon: <Calendar size={18} />, label: "Availability & Schedule" },
    { key: "security", icon: <ShieldAlert size={18} />, label: "Security & Communication" },
    { key: "history", icon: <Briefcase size={18} />, label: "Work History" },
    { key: "find-work", icon: <Users size={18} />, label: "Find Work" },
  ];

  // Fetch worker's location using GPS coordinates with reverse geocoding
  useEffect(() => {
    const fetchLocation = async () => {
      // If manual city is set, use it as priority
      if (manualCity) {
        setWorkerLocation(prev => ({
          ...prev,
          city: manualCity,
          country: "India"
        }));
      }

      // Try to get GPS coordinates from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Use reverse geocoding to get accurate city name from GPS coordinates
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'EzyWork-App'
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                const address = data.address || {};

                // Extract city from various possible fields
                const city = manualCity ||
                  address.city ||
                  address.town ||
                  address.village ||
                  address.county ||
                  address.state_district ||
                  "Unknown";
                const country = address.country || "India";

                setWorkerLocation({
                  latitude,
                  longitude,
                  city,
                  country
                });

                console.log(`GPS Location: ${city}, ${country} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
              }
            } catch (error) {
              console.error("Reverse geocoding failed:", error);
              // Fallback: use coordinates with manual city or Unknown
              setWorkerLocation({
                latitude,
                longitude,
                city: manualCity || "Unknown",
                country: "India"
              });
            }
          },
          async (error) => {
            console.warn("GPS location unavailable:", error.message);

            // Fallback to IP-based geolocation if GPS fails
            try {
              const ipApiResponse = await fetch('https://ipapi.co/json/');
              if (ipApiResponse.ok) {
                const ipData = await ipApiResponse.json();

                setWorkerLocation({
                  latitude: ipData.latitude || null,
                  longitude: ipData.longitude || null,
                  city: manualCity || ipData.city || "Unknown",
                  country: ipData.country_name || "India"
                });

                console.log(`IP-based Location (GPS unavailable): ${ipData.city}, ${ipData.country_name}`);
              }
            } catch (ipError) {
              console.error("IP-based geolocation also failed:", ipError);
              // Final fallback
              setWorkerLocation(prev => ({
                ...prev,
                city: manualCity || "Unknown",
                country: "India"
              }));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    };

    fetchLocation();
  }, [manualCity]);

  // Function to save worker's location preference
  const saveLocationPreference = async (city) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/workers/${user.id || user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: city })
      });

      if (!res.ok) throw new Error("Failed to save location");

      setManualCity(city);
      setWorkerLocation(prev => ({
        ...prev,
        city: city,
        country: "India"
      }));
      setLocationModalOpen(false);
      alert("Location updated successfully!");
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Failed to save location");
    }
  };

  // Handle reject job
  async function handleRejectJob(problemId) {
    if (!workerId) {
      alert("Worker profile is still loading. Please try again in a moment.");
      return false;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/${problemId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reject job");
      }

      alert(data.message || "Job rejected successfully");
      await fetchAssignedProblems();
      setRefreshTrigger((prev) => !prev);
      setHistory((prev) => prev.filter((problem) => problem._id !== problemId));
      return true;
    } catch (err) {
      console.error("Failed to reject job:", err);
      alert(err.message || "Failed to reject job");
      return false;
    }
  }

  // Verify OTP and complete job
  async function verifyOtp(jobId, otpValue) {
    // Validate OTP format
    const otpArray = otpValue.split("");
    const otpValidation = validOtp(otpArray);

    if (!otpValidation.ok) {
      alert(otpValidation.message);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/${jobId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue })
      });

      if (res.ok) {
        await res.json();
        alert("OTP matched. Job completed, but payment is still pending until the customer pays.");
        fetchAssignedProblems();
        setRefreshTrigger((prev) => !prev);
      } else {
        const error = await res.json();
        alert(error.message || "Failed to complete job");
      }
    } catch (err) {
      console.error("Error completing job:", err);
      alert("Failed to complete job. Please try again.");
    }

    setOtpModal({ open: false, jobId: null });
  }

  // Simulate UPI withdraw
  function submitWithdraw(amount) {
    if (!upiId) {
      alert("Enter a valid UPI ID first.");
      return;
    }
    // simulate success
    setWithdrawModalOpen(false);
    alert(`Withdrawal of INR ${amount} initiated to ${upiId}`);
  }

  // Fraud report submit
  function submitFraudReport(details) {
    if (!details.trim()) {
      alert("Please add report details before submitting.");
      return;
    }

    setFraudReportOpen(false);
    alert("Fraud report submitted. Support will review it shortly.");
  }

  // Handle Job Acceptance
  const handleAcceptJob = async (jobId) => {
    if (!workerId) {
      alert("Worker profile is still loading. Please try again in a moment.");
      return false;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/${jobId}/accept`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId }) // Send worker ID
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to accept job");

      alert("Job Accepted Successfully!");
      await fetchAssignedProblems();
      setRefreshTrigger((prev) => !prev);
      setActiveSection("job");
      return true;
    } catch (error) {
      console.error("Error accepting job:", error);
      alert("Failed to accept job: " + (error.message || "Unknown error"));
      return false;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0b1220] dark:text-gray-100 md:flex-row">
      {/* Shift Start Modal (Overlay if Offline) */}
      {!online && (
        <ShiftStartModal
          onStart={() => handleToggleOnline()}
          location={workerLocation}
        />
      )}
      {/* Fixed Sidebar */}

      <aside className="w-full bg-white dark:bg-[#0f172a] border-b dark:border-slate-800 shadow-lg flex flex-col justify-between md:fixed md:inset-y-0 md:w-72 md:border-b-0 md:border-r md:h-screen">
        <div>
          <div className="py-6 px-6 text-center">
            <h1 className="text-2xl font-bold text-green-600">Worker Pro</h1>
            <p className="text-xs text-gray-500 mt-1">Be your best. Get matched smarter.</p>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:block md:space-y-2 md:overflow-visible">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`shrink-0 md:w-full text-left flex items-center gap-3 px-4 py-2 rounded-md transition font-medium text-sm ${activeSection === item.key
                  ? "bg-green-50 text-green-700"
                  : "hover:bg-gray-100 text-gray-700"
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom: user info + online toggle + logout */}
        <div className="px-4 py-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src="https://via.placeholder.com/44" alt="user" className="rounded-full" />
              <div>
                <p className="font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">✅ Verified Worker</p>
              </div>
            </div>
            <button
              onClick={handleToggleOnline}
              className={`px-3 py-1 rounded-md text-sm font-medium ${online ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              aria-pressed={online}
            >
              {online ? "Online" : "Go Online"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setLocationModalOpen(true)} className="text-sm text-gray-600 hover:text-gray-80">⚙️ Settings</button>
            
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 md:ml-72">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 sm:text-3xl">{activeSection === "job" ? "Job Management" : activeSection === "wallet" ? "Wallet & Earnings" : activeSection === "performance" ? "Live Analytics" : activeSection === "availability" ? "Availability & Schedule" : activeSection === "security" ? "Security & Communication" : activeSection === "find-work" ? "Find Work" : "Work History"}</h2>
            <p className="mt-1 text-sm text-gray-500">Manage live requests, workflow status, earnings, and history from one place.</p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-gray-600 xl:flex-row xl:flex-wrap xl:items-center xl:justify-end">
            <div className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-slate-900">Status: <strong>{online ? "Available" : "Offline"}</strong></div>
            <div className="rounded-full bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
              Location: {" "}
              <strong>
                {workerLocation.city}, {workerLocation.country} (
                {workerLocation.latitude?.toFixed(2)}, {" "}
                {workerLocation.longitude?.toFixed(2)})
              </strong>
            </div>
            <button onClick={() => setActiveSection("wallet")} className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">Open Wallet</button>
            <button onClick={() => setWithdrawModalOpen(true)} className="rounded-md border bg-white px-3 py-2">Withdraw</button>
          </div>
        </div>

        {/* SECTION RENDER */}
        {activeSection === "job" && (
          <JobSection
            problems={assignedProblems}
            onAcceptJob={handleAcceptJob}
            onRejectJob={handleRejectJob}
            onCompleteJob={(problemId) => setOtpModal({ open: true, jobId: problemId })}
            fetchAssignedProblems={fetchAssignedProblems}
            workerLocation={workerLocation}
          />
        )}
        {activeSection === "wallet" && (
          <WalletSection jobs={assignedProblems} balance={walletBalance} onWithdrawClick={() => setWithdrawModalOpen(true)} />
        )}
        {activeSection === "performance" && (
          <PerformanceSection jobs={history} />
        )}
        {activeSection === "availability" && <AvailabilitySection />}
        {activeSection === "security" && (
          <SecuritySection onReport={() => setFraudReportOpen(true)} />
        )}
        {activeSection === "history" && (
          <HistorySection jobs={history} />
        )}
        {activeSection === "find-work" && (
          <FindWorkSection
            workerCategory={getPrimaryWorkerCategory(workerProfile?.typeOfWork)}
            onAccept={handleAcceptJob}
            onReject={handleRejectJob}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>


      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <WithdrawModal
          upiId={upiId}
          setUpiId={setUpiId}
          onClose={() => setWithdrawModalOpen(false)}
          onSubmit={(amount) => submitWithdraw(amount)}
        />
      )}

      {/* Fraud Report Modal */}
      {fraudReportOpen && (
        <FraudReportModal onClose={() => setFraudReportOpen(false)} onSubmit={(d) => submitFraudReport(d)} />
      )}

      {/* OTP Modal */}
      {otpModal.open && (
        <OtpModal
          jobId={otpModal.jobId}
          onClose={() => setOtpModal({ open: false, jobId: null })}
          onVerify={(otp) => verifyOtp(otpModal.jobId, otp)}
        />
      )}

      {/* Payment Success Modal */}
      {paymentSuccess.open && (
        <PaymentSuccessModal
          message={paymentSuccess.message}
          onClose={() => setPaymentSuccess({ open: false, message: "" })}
        />
      )}

      {/* Location Settings Modal */}
      {locationModalOpen && (
        <LocationSettingsModal
          currentCity={manualCity || workerLocation.city || ""}
          onClose={() => setLocationModalOpen(false)}
          onSave={saveLocationPreference}
        />
      )}
    </div>
  );
}

/* ------------------ Job Section ------------------ */
function JobSection({ problems, onAcceptJob, onRejectJob, onCompleteJob, fetchAssignedProblems, workerLocation }) {
  const requestedProblems = problems.filter((p) => p.status === 'requested');
  const activeProblems = problems.filter((p) => p.status === 'assigned' || p.status === 'in_progress');
  const completedProblems = problems.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Job Requests */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Job Requests</h3>
            <Badge>{requestedProblems.length}</Badge>
          </div>

          <div className="space-y-3">
            {requestedProblems.length === 0 && <p className="text-sm text-gray-500">No job requests.</p>}

            {requestedProblems.map((problem) => (
              <div key={problem._id} className="border p-4 rounded-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{problem.createdBy?.name || "Customer"} • {problem.location?.city || "Unknown"}</p>
                    <p className="text-xs text-gray-500 mt-1">{problem.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        const success = await onAcceptJob(problem._id);
                        if (success) {
                          fetchAssignedProblems();
                        }
                      }}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
                    >
                      Accept
                    </button>
                    <button
                      onClick={async () => {
                        const success = await onRejectJob(problem._id);
                        if (success) {
                          fetchAssignedProblems();
                        }
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active jobs list */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Active Jobs</h3>
            <Badge>Auto-matching ON</Badge>
          </div>

          <div className="space-y-3">
            {activeProblems.length === 0 && <p className="text-sm text-gray-500">No active jobs right now.</p>}

            {activeProblems.map((problem) => (
              <div key={problem._id} className="border p-4 rounded-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{problem.title}</h4>
                      <span className="text-xs text-gray-400">{new Date(problem.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-500">{problem.createdBy?.name || "Customer"} • {problem.location?.city || "Unknown"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">Method: {problem.paymentMethod || "N/A"}</span>
                      <span className={`rounded-full px-2.5 py-1 ${getPaymentState(problem).tone}`}>{getPaymentState(problem).label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge className="bg-blue-50 text-blue-700">OTP only for completion</Badge>
                      <Badge>{problem.status}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {problem.status === 'assigned' && (
                      <button 
                        onClick={async () => {
                          // Start the job
                          try {
                            await fetch(`${API_BASE_URL}/api/problems/${problem._id}/start`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                            });
                            fetchAssignedProblems();
                          } catch (err) {
                            console.error("Failed to start job:", err);
                          }
                        }}
                        className="px-3 py-1 rounded-md bg-green-600 text-white text-sm"
                      >
                        Start Job
                      </button>
                    )}
                    {problem.status === 'in_progress' && (
                      <button 
                        onClick={() => onCompleteJob(problem._id)}
                        className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm pointer-events-auto"
                      >
                        Complete Job
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed jobs */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Recent Completed Jobs</h3>
          <div className="space-y-3">
            {completedProblems.length === 0 && <p className="text-sm text-gray-500">No completed jobs yet.</p>}
            {completedProblems.slice(0, 5).map((problem) => (
              <div key={problem._id} className="border p-4 rounded-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="font-medium">{problem.title}</h4>
                    <p className="text-sm text-gray-500">{problem.createdBy?.name || "Customer"}</p>
                    <p className="text-xs text-gray-500">Completed: {new Date(problem.completedAt).toLocaleDateString()}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">Method: {problem.paymentMethod || "N/A"}</span>
                      <span className={`rounded-full px-2.5 py-1 ${getPaymentState(problem).tone}`}>{getPaymentState(problem).label}</span>
                    </div>
                  </div>
                  <Badge className={problem.paymentStatus === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                    {problem.paymentStatus === "completed" ? "Completed & paid" : "Payment pending"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Location */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-2">Worker Live Location</h3>
        <p className="text-sm text-gray-500">
          Latitude: {workerLocation.latitude?.toFixed(2)}, Longitude:{" "}
          {workerLocation.longitude?.toFixed(2)}
        </p>
        <p className="text-sm text-gray-500">
          Location: {workerLocation.city}, {workerLocation.country}
        </p>
      </div>
    </div>
  );
}

/* ------------------ Wallet Section ------------------ */
function WalletSection({ jobs, balance, onWithdrawClick }) {
  const paidJobs = jobs.filter((job) => job.paymentStatus === "completed");
  const pendingJobs = jobs.filter((job) => job.status === "completed" && job.paymentStatus !== "completed");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Wallet & Balance</h3>
          <Badge>Secure</Badge>
        </div>
        <p className="text-4xl font-bold">INR {balance.toFixed(0)}</p>
        <p className="text-sm text-gray-500 mb-4">Available balance from paid jobs only</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => onWithdrawClick()} className="bg-green-600 text-white px-4 py-2 rounded-md">Withdraw</button>
          <button className="bg-white border px-4 py-2 rounded-md">Transaction History</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-3">Payment Sync</h3>
        <p className="text-sm text-gray-500 leading-6">
          Jobs stay marked as unpaid until the customer finishes payment. The dashboard refreshes automatically when payment is received.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-gray-500">Paid jobs</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{paidJobs.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-gray-500">Payment pending</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{pendingJobs.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Performance Section ------------------ */
function PerformanceSection({ jobs }) {
  const statusData = buildStatusData(jobs);
  const categoryData = buildCategoryData(jobs);
  const summary = jobs.reduce(
    (acc, job) => {
      acc.total += 1;
      if (job.paymentStatus === "completed") acc.earnings += Number(job.amount || 0);
      if (job.status === "completed") acc.completed += 1;
      if (job.status === "completed" && job.paymentStatus !== "completed") acc.paymentPending += 1;
      if (job.status === "requested") acc.requested += 1;
      if (job.status === "assigned" || job.status === "in_progress") acc.active += 1;
      return acc;
    },
    { total: 0, completed: 0, requested: 0, active: 0, paymentPending: 0, earnings: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total jobs</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active jobs</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.active}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Completed jobs</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.completed}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Paid earnings</p>
          <p className="mt-2 text-3xl font-semibold text-gray-500">INR {summary.earnings.toFixed(0)}</p>
          <p className="mt-1 text-xs text-amber-600">{summary.paymentPending} payment pending</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h4 className="mb-3 font-semibold">Job status overview</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h4 className="mb-3 font-semibold">Job categories</h4>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-500">No job categories available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h4 className="mb-3 font-semibold">Workflow notes</h4>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3 text-sm text-gray-600">Accept moves a job from <strong>requested</strong> to <strong>assigned</strong>.</div>
          <div className="rounded-lg border p-3 text-sm text-gray-600">Start moves a job from <strong>assigned</strong> to <strong>in progress</strong>.</div>
          <div className="rounded-lg border p-3 text-sm text-gray-600">Complete requires OTP; payment stays pending until the customer pays.</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Availability Section ------------------ */
function AvailabilitySection() {
  const days = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
  ];

  const [schedule, setSchedule] = useState(() =>
    days.reduce((acc, d) => {
      acc[d.key] = { enabled: false, from: "08:00", to: "18:00" };
      return acc;
    }, {})
  );

  function toggleDay(dayKey) {
    setSchedule((s) => ({ ...s, [dayKey]: { ...s[dayKey], enabled: !s[dayKey].enabled } }));
  }

  function updateTime(dayKey, field, value) {
    setSchedule((s) => ({ ...s, [dayKey]: { ...s[dayKey], [field]: value } }));
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm max-w-3xl">
      <h3 className="font-semibold mb-4">Set Working Days & Hours</h3>
      <p className="text-sm text-gray-500 mb-4">Enable days you want to receive bookings and set your work hours. Auto-decline outside these hours.</p>
      <div className="space-y-2">
        {days.map((d) => (
          <div key={d.key} className="flex items-center justify-between border p-3 rounded-md">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={schedule[d.key].enabled} onChange={() => toggleDay(d.key)} />
              <div>
                <div className="font-medium">{d.label}</div>
                <div className="text-xs text-gray-500">{schedule[d.key].enabled ? `${schedule[d.key].from} - ${schedule[d.key].to}` : "Not available"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="time" value={schedule[d.key].from} onChange={(e) => updateTime(d.key, 'from', e.target.value)} className="border rounded-md px-2 py-1 text-sm" disabled={!schedule[d.key].enabled} />
              <input type="time" value={schedule[d.key].to} onChange={(e) => updateTime(d.key, 'to', e.target.value)} className="border rounded-md px-2 py-1 text-sm" disabled={!schedule[d.key].enabled} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button className="bg-green-600 text-white px-4 py-2 rounded-md">Save Schedule</button>
      </div>
    </div>
  );
}

/* ------------------ Security Section ------------------ */
function SecuritySection({ onReport }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-3">Security & Communication</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>🔒 All chats are <strong>end-to-end encrypted</strong>.</li>
          <li>🧠 Fraud detection system monitors unusual behavior and flags suspicious transactions or customers.</li>
          <li>💬 Secure chat is available only for verified customers; unknown users are restricted.</li>
          <li>🛡️ 2-step verification (OTP) is required to mark jobs as complete.</li>
          <li>📄 All invoices & payments are processed via verified gateways with tamper-evident records.</li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h4 className="font-semibold mb-3">Fraud & Dispute Tools</h4>
        <p className="text-sm text-gray-500 mb-3">If you notice suspicious activity (fake OTP attempts, chargeback risk, threatening behavior), report it and our support team will investigate.</p>
        <div className="flex gap-3">
          <button onClick={onReport} className="px-4 py-2 bg-red-600 text-white rounded-md">Report Fraud</button>
          <button className="px-4 py-2 bg-white border rounded-md">View Disputes</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ History Section ------------------ */
function HistorySection({ jobs }) {
  const orderedJobs = [...jobs].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold">Work History</h3>
          <p className="text-sm text-gray-500">Live record of job CRUD updates from the backend.</p>
        </div>
        <Badge className="bg-green-50 text-green-700">{orderedJobs.length} records</Badge>
      </div>

      <div className="grid gap-4">
        {orderedJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">No job history yet.</div>
        ) : (
          orderedJobs.map((job) => (
            <article key={job._id} className="rounded-xl border p-4 transition hover:bg-gray-50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-gray-900">{job.title}</h4>
                    <Badge className="bg-gray-100 text-gray-700">{STATUS_LABELS[job.status] || job.status || "Unknown"}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{job.createdBy?.name || "Customer"} • {job.location?.city || "Unknown"}</p>
                  <p className="text-sm text-gray-600">Created: {formatDateTime(job.createdAt)}</p>
                  <p className="text-sm text-gray-600">Assigned: {formatDateTime(job.assignedAt)}</p>
                  <p className="text-sm text-gray-600">Completed: {formatDateTime(job.completedAt)}</p>
                </div>
                <div className="min-w-32 rounded-lg bg-gray-50 p-3 text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Amount</p>
                  <p className="text-lg font-semibold text-gray-200">INR {Number(job.amount || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-500">
                    Payment: {job.paymentStatus === "completed" ? "completed" : "pending"}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------ Find Work Section (Job Board) ------------------ */
function FindWorkSection({ workerCategory, onAccept, onReject, refreshTrigger }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        let url = `${API_BASE_URL}/api/problems/open`;
        if (workerCategory) {
          url += `?category=${workerCategory}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        setProblems(data);
      } catch (err) {
        console.error("Failed to fetch problems", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();

    // Poll every 5 seconds for updates
    const interval = setInterval(fetchProblems, 5000);
    
    return () => clearInterval(interval);

  }, [workerCategory, refreshTrigger]);

  if (loading) return <div>Loading available jobs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Available Jobs</h3>
        <Badge>{problems.length} Jobs Found</Badge>
      </div>

      <div className="grid gap-4">
        {problems.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg">
            <p className="text-gray-500">No matching jobs available right now.</p>
            <p className="text-sm text-gray-400">Wait for notifications or check back later.</p>
          </div>
        ) : (
          problems.map(problem => (
            <div key={problem._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:shadow-md transition">
              <div>
                <h4 className="font-bold text-lg text-gray-800">{problem.title}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-semibold">{problem.category}</span>
                  <span>• {problem.location?.city || "Unknown Location"}</span>
                  <span>• Posted {new Date(problem.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-gray-600 mt-2 text-sm">{problem.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onAccept(problem._id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition transform active:scale-95"
                >
                  Accept Job
                </button>
                <button
                  onClick={async () => {
                    const success = await onReject(problem._id);
                    if (success) {
                      setProblems((prev) => prev.filter((p) => p._id !== problem._id));
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition transform active:scale-95"
                >
                  Reject Job
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------ Shift Start Modal ------------------ */
function ShiftStartModal({ onStart, location = {} }) {
  // Get today's date in local timezone (not UTC)
  const getTodayDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get current time in local timezone
  const getCurrentTimeString = () => {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [locationInput, setLocationInput] = useState(location && location.city ? location.city : "");

  useEffect(() => {
    if (location?.city) setLocationInput(location.city);
  }, [location]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Start Your Shift</h2>
          <p className="text-gray-500 mt-2">Ready to take on new jobs? Confirm your details below.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
            <input
              type="text"
              value={locationInput}
              placeholder="Detecting location..."
              readOnly
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Location is automatically detected</p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Start Work Now
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          By starting, you agree to receive job notifications.
        </p>
      </div>
    </div>
  );
}

// Helper icon import (Mocking User icon if not imported, or just use Lucide existing imports)



/* ------------------ OTP Modal ------------------ */
function OtpModal({ jobId, onClose, onVerify }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    // Validate OTP format before calling onVerify
    const otpArray = otp.split("");
    const otpValidation = validOtp(otpArray);

    if (!otpValidation.ok) {
      setError(otpValidation.message);
      return;
    }

    setError("");
    onVerify(otp);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h4 className="font-semibold mb-2">Enter OTP to complete job</h4>
        <p className="text-sm text-gray-500 mb-4">Ask the customer for the 6-digit OTP and enter it here.</p>
        {jobId && <p className="mb-3 text-xs text-gray-400">Job ID: {jobId}</p>}
        <input
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value);
            setError("");
          }}
          placeholder="Enter 6-digit OTP"
          className={`w-full border rounded-md px-3 py-2 mb-2 ${error ? 'border-red-500' : ''}`}
          maxLength="6"
          type="number"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={handleVerify} className="px-4 py-2 rounded-md bg-green-600 text-white">Verify & Complete</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Payment Success Modal ------------------ */
function PaymentSuccessModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h4 className="font-semibold mb-2">Payment received</h4>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-md bg-green-600 px-4 py-2 text-white">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Withdraw Modal ------------------ */
function WithdrawModal({ upiId, setUpiId, onClose, onSubmit }) {
  const [amount, setAmount] = useState(100);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h4 className="font-semibold mb-2">Withdraw Funds</h4>
        <p className="text-sm text-gray-500 mb-4">Enter a UPI ID to transfer your balance instantly.</p>
        <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="example@upi" className="w-full border rounded-md px-3 py-2 mb-3" />
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-md px-3 py-2 mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={() => onSubmit(amount)} className="px-4 py-2 rounded-md bg-green-600 text-white">Withdraw</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Fraud Report Modal ------------------ */
function FraudReportModal({ onClose, onSubmit }) {
  const [details, setDetails] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h4 className="font-semibold mb-2">Report Fraud / Dispute</h4>
        <p className="text-sm text-gray-500 mb-3">Describe the issue — include job id, customer name and why you suspect fraud.</p>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} className="w-full border rounded-md px-3 py-2 mb-3" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={() => onSubmit(details)} className="px-4 py-2 rounded-md bg-red-600 text-white">Submit Report</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Location Settings Modal ------------------ */
function LocationSettingsModal({ currentCity, onClose, onSave }) {
  const [city, setCity] = useState(currentCity);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common punjab cities and towns
  const punjabLocations = [
    "Jansla", "Rupnagar", "Mohali", "Chandigarh", "Patiala", "Ludhiana",
    "Amritsar", "Jalandhar", "Bathinda", "Hoshiarpur", "Nawanshahr",
    "Sangrur", "Moga", "Muktsar", "Ferozepur", "Kapurthala", "Barnala"
  ];

  const filtered = punjabLocations.filter(loc =>
    loc.toLowerCase().includes(city.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Update Location</h2>
          <p className="text-gray-500 mt-2">Correct your work location so customers can find you accurately.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your City/Town</label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g., Jansla, Rupnagar..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              />

              {/* Suggestions dropdown */}
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                  {filtered.map((location) => (
                    <button
                      key={location}
                      onClick={() => {
                        setCity(location);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-green-50 transition border-b last:border-b-0"
                    >
                      <MapPin size={14} className="inline mr-2 text-gray-500" />
                      {location}, Punjab, India
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">This is your registered work location. Ensure it's accurate.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Your location is used to match jobs near you. GPS coordinates are also captured for real-time tracking.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(city)}
            disabled={!city}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
}


