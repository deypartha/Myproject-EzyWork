import React, { useState, useEffect, useMemo, useRef } from "react"; // Added useRef
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
import { validOtp } from "../../../utils/otp.validator";

// --- Sample data ---
const performanceWeekly = [
  { day: "Mon", jobs: 10, earnings: 200 },
  { day: "Tue", jobs: 12, earnings: 260 },
  { day: "Wed", jobs: 8, earnings: 180 },
  { day: "Thu", jobs: 14, earnings: 320 },
  { day: "Fri", jobs: 9, earnings: 220 },
  { day: "Sat", jobs: 6, earnings: 140 },
  { day: "Sun", jobs: 4, earnings: 100 },
];
const performanceMonthly = Array.from({ length: 12 }).map((_, i) => ({
  month: `M${i + 1}`,
  jobs: Math.round(60 + Math.random() * 80),
  earnings: Math.round(1200 + Math.random() * 3000),
}));

const pieData = [
  { name: "Electrical", value: 35 },
  { name: "Plumbing", value: 25 },
  { name: "Cleaning", value: 20 },
  { name: "Painting", value: 20 },
];
const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];

// --- Mock job history ---
const initialHistory = [
  {
    id: "job_001",
    title: "AC Repair",
    customer: "Ravi Kumar",
    location: "Delhi",
    status: "completed",
    earned: 200,
    amount: 200,
    date: "2025-11-10",
  },
  {
    id: "job_002",
    title: "Pipe Leakage",
    customer: "Anita Sharma",
    location: "Gurgaon",
    status: "pending",
    earned: 0,
    amount: 350,
    date: "2025-11-11",
  },
];

// --- Utility small components ---
function Badge({ children }) {
  return (
    <span className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
      {children}
    </span>
  );
}

// --- Main Dashboard ---
export default function WorkerDashboard() {
  const [activeSection, setActiveSection] = useState("job");
  const [online, setOnline] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [otpModal, setOtpModal] = useState({ open: false, jobId: null });
  const [paymentModal, setPaymentModal] = useState({ open: false, jobId: null });
  const [paymentSuccess, setPaymentSuccess] = useState({ open: false, message: "" });
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [fraudReportOpen, setFraudReportOpen] = useState(false);
  const [performanceRange, setPerformanceRange] = useState("weekly");
  const [walletBalance, setWalletBalance] = useState(1230);
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
  const socketRef = useRef(null); // Socket reference

  // Initialize Socket
  useEffect(() => {
    socketRef.current = io(API_BASE_URL);
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Fetch Worker Profile to get Skills and Registered Location
  useEffect(() => {
    if (user && user.id) {
      const fetchWorkerProfile = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/workers/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setWorkerProfile(data);
            // Use registered location as primary
            if (data.location) {
              setManualCity(data.location);
              setWorkerLocation(prev => ({
                ...prev,
                city: data.location,
                country: "India" // Default to India if not specified
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching worker profile:", error);
        }
      };
      fetchWorkerProfile();
    }
  }, [user]);

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

      const skills = workerProfile?.typeOfWork || ["Plumber", "Electrician", "Painter"]; // Fallback

      if (newStatus) {
        skills.forEach(skill => {
          socketRef.current.emit("join-room", skill);
          console.log("Joined room:", skill);
        });
      } else {
        skills.forEach(skill => {
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
    if (!socketRef.current) return;

    socketRef.current.on("new-problem", (problem) => {
      console.log("New Problem Received:", problem);
      // Play notification sound?
      alert(`New Job Alert: ${problem.title}`);

      // Add to history (or a new 'availableJobs' list)
      // Mapping problem model to history model
      const newJob = {
        id: problem._id,
        title: problem.title,
        customer: "New Customer", // Name isn't in problem yet, maybe fetch or just show generic
        location: problem.location?.city || "Unknown",
        status: "pending",
        earned: 0,
        amount: 0, // Not set in problem yet
        date: new Date().toISOString().split('T')[0]
      };

      setHistory(prev => [newJob, ...prev]);
    });

    return () => {
      socketRef.current.off("new-problem");
    };
  }, []);

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
      const res = await fetch(`${API_BASE_URL}/api/workers/${user.id}`, {
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

  // Fetch city and country using reverse geocoding API
  // Using OpenStreetMap Nominatim (free, reliable, no API key needed)
  // NOTE: This is NOT used as primary - registered location takes priority
  const fetchCityAndCountry = async (latitude, longitude) => {
    try {
      // Try Nominatim first (open street map - no rate limiting for reasonable use)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'EzyWork-App' // Nominatim requires User-Agent
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract city and country from Nominatim response
      // Try to get the smallest locality first (village > town > city)
      const address = data.address || {};
      const city = address.village || address.town || address.city || address.county || "Unknown";
      const country = address.country || "Unknown";

      return { city, country };
    } catch (error) {
      console.error("Error fetching city and country:", error);
      return { city: "Unknown", country: "Unknown" };
    }
  };

  // Mark job as completed: open OTP modal
  function handleEndJob(jobId) {
    setOtpModal({ open: true, jobId });
  }

  // Verify OTP and complete job
  function verifyOtp(jobId, otpValue) {
    // Validate OTP format
    const otpArray = otpValue.split("");
    const otpValidation = validOtp(otpArray);

    if (!otpValidation.ok) {
      alert(otpValidation.message);
      return;
    }

    setHistory((h) =>
      h.map((j) => (j.id === jobId ? { ...j, status: "otp-verified" } : j))
    );
    setOtpModal({ open: false, jobId: null });
    setPaymentModal({ open: true, jobId });
  }

  function handlePayment(jobId, method) {
    const job = history.find((h) => h.id === jobId);
    if (!job) return;
    const amount = job.amount || 0;

    setHistory((h) =>
      h.map((j) =>
        j.id === jobId ? { ...j, status: "completed", earned: amount } : j
      )
    );

    if (method === "cash") {
      setWalletBalance((b) => Math.max(0, b - amount));
    } else {
      setWalletBalance((b) => b + amount);
    }

    setPaymentModal({ open: false, jobId: null });
    setPaymentSuccess({
      open: true,
      message:
        "Payment successful. Receipt sent to both worker and customer.",
    });
  }

  // Simulate UPI withdraw
  function submitWithdraw(amount) {
    if (!upiId) {
      alert("Enter a valid UPI ID first.");
      return;
    }
    // simulate success
    setWithdrawModalOpen(false);
    alert(`Withdrawal of $${amount} initiated to ${upiId}`);
  }

  // Fraud report submit
  // Handle Job Acceptance
  const handleAcceptJob = async (jobId) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/${jobId}/accept`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: user._id || user.id }) // Send worker ID
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert("Job Accepted Successfully!");

      // Add to active jobs (history with pending status for now, or accepted)
      const newJob = {
        id: data.problem._id,
        title: data.problem.title,
        customer: "Customer", // You might want to fetch user details or send them in response
        location: data.problem.location?.city || "Unknown",
        status: "pending", // Start as pending until finished? Or "accepted"
        earned: 0,
        amount: 0, // Needs to be negotiated or set
        date: new Date().toISOString().split('T')[0]
      };
      setHistory(prev => [newJob, ...prev]);
      setActiveSection("job"); // Switch to My Jobs view

    } catch (error) {
      console.error("Error accepting job:", error);
      alert("Failed to accept job: " + error.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0b1220] dark:text-gray-100">
      {/* Shift Start Modal (Overlay if Offline) */}
      {!online && (
        <ShiftStartModal
          onStart={() => handleToggleOnline()}
          location={workerLocation}
        />
      )}
      {/* Fixed Sidebar */}

      <aside className="w-72 bg-white dark:bg-[#0f172a] border-r dark:border-slate-800 shadow-lg flex flex-col justify-between fixed h-screen">
        <div>
          <div className="py-6 px-6 text-center">
            <h1 className="text-2xl font-bold text-green-600">Worker Pro</h1>
            <p className="text-xs text-gray-500 mt-1">Be your best. Get matched smarter.</p>
          </div>

          <nav className="space-y-2 px-4">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded-md transition font-medium text-sm ${activeSection === item.key
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
                <p className="font-semibold text-gray-800">John Doe</p>
                <p className="text-xs text-gray-500">Verified Worker</p>
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
            <button onClick={() => setLocationModalOpen(true)} className="text-sm text-gray-600 hover:text-gray-800">Settings</button>
            <button className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-md">Logout</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-72 flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-semibold text-gray-800">{activeSection === "job" ? "Job Management" : activeSection === "wallet" ? "Wallet & Earnings" : activeSection === "performance" ? "Performance Analytics" : activeSection === "availability" ? "Availability & Schedule" : activeSection === "security" ? "Security & Communication" : "Work History"}</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your work, earnings, and settings from one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Status: <strong>{online ? "Available" : "Offline"}</strong></div>
            <div className="text-sm text-gray-600">
              Location:{" "}
              <strong>
                {workerLocation.city}, {workerLocation.country} (
                {workerLocation.latitude?.toFixed(2)},{" "}
                {workerLocation.longitude?.toFixed(2)})
              </strong>
            </div>
            <button onClick={() => setActiveSection("wallet")} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">Open Wallet</button>
            <button onClick={() => setWithdrawModalOpen(true)} className="bg-white border px-3 py-2 rounded-md">Withdraw</button>
          </div>
        </div>

        {/* SECTION RENDER */}
        {activeSection === "job" && (
          <JobSection
            history={history}
            onEndJob={handleEndJob}
            onCollectPayment={(jobId) => setPaymentModal({ open: true, jobId })}
            setHistory={setHistory}
            workerLocation={workerLocation}
          />
        )}
        {activeSection === "wallet" && (
          <WalletSection balance={walletBalance} onWithdrawClick={() => setWithdrawModalOpen(true)} />
        )}
        {activeSection === "performance" && (
          <PerformanceSection range={performanceRange} setRange={setPerformanceRange} />
        )}
        {activeSection === "availability" && <AvailabilitySection />}
        {activeSection === "security" && (
          <SecuritySection onReport={() => setFraudReportOpen(true)} />
        )}
        {activeSection === "history" && (
          <HistorySection history={history} />
        )}
        {activeSection === "find-work" && (
          <FindWorkSection
            workerCategory={workerProfile?.typeOfWork ? workerProfile.typeOfWork[0] : ""}
            onAccept={handleAcceptJob}
          />
        )}
      </main>

      {/* OTP Modal */}
      {otpModal.open && (
        <OtpModal
          jobId={otpModal.jobId}
          onClose={() => setOtpModal({ open: false, jobId: null })}
          onVerify={(otp) => verifyOtp(otpModal.jobId, otp)}
        />
      )}

      {/* Payment Modal */}
      {paymentModal.open && (
        <PaymentModal
          job={history.find((h) => h.id === paymentModal.jobId)}
          onClose={() => setPaymentModal({ open: false, jobId: null })}
          onConfirm={(method) => handlePayment(paymentModal.jobId, method)}
        />
      )}

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
function JobSection({ history, onEndJob, onCollectPayment, setHistory, workerLocation }) {
  const activeJobs = history.filter((h) => h.status === "pending");
  const nextJob = activeJobs[0]; // Assuming the first pending job is the next job

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Active jobs list */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Active / Pending Jobs</h3>
            <Badge>Auto-matching ON</Badge>
          </div>

          <div className="space-y-3">
            {activeJobs.length === 0 && <p className="text-sm text-gray-500">No pending jobs right now.</p>}

            {activeJobs.map((job) => (
              <div key={job.id} className="border p-4 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{job.title}</h4>
                    <span className="text-xs text-gray-400">{job.date}</span>
                  </div>
                  <p className="text-sm text-gray-500">{job.customer} • {job.location}</p>
                  <p className="text-xs text-gray-500 mt-1">Amount: ${job.amount || 0}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <Badge>OTP on Complete</Badge>
                    <Badge>Photos</Badge>
                    <Badge>Nav</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Accept/Reject */}
                  {job.status === "pending" && (
                    <>
                      <button onClick={() => setHistory((h) => h.map((j) => (j.id === job.id ? { ...j, status: "accepted" } : j)))} className="px-3 py-1 rounded-md bg-green-600 text-white text-sm">Accept</button>
                      <button onClick={() => setHistory((h) => h.map((j) => (j.id === job.id ? { ...j, status: "rejected" } : j)))} className="px-3 py-1 rounded-md bg-red-50 text-red-600 border">Reject</button>
                    </>
                  )}

                  {/* If accepted show start/end */}
                  {(job.status === "accepted" || job.status === "pending") && (
                    <>
                      <button onClick={() => onEndJob(job.id)} className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">End Job</button>
                    </>
                  )}

                  {job.status === "otp-verified" && (
                    <button onClick={() => onCollectPayment(job.id)} className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm">Collect Payment</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Job */}
        {nextJob && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-2">Next Job</h3>
            <p className="text-sm text-gray-500 mb-4">
              {nextJob.title} • {nextJob.customer} • {nextJob.location}
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-green-600 text-white rounded-md">
                View Photos
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Navigate
              </button>
            </div>
          </div>
        )}
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
function WalletSection({ balance, onWithdrawClick }) {
  const recent = [
    { id: 1, text: "+ $200 — Job Completed", date: "2025-11-10" },
    { id: 2, text: "- $50 — Withdrawal", date: "2025-11-09" },
  ];

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Wallet & Balance</h3>
          <Badge>Secure</Badge>
        </div>
        <p className="text-4xl font-bold">${balance}</p>
        <p className="text-sm text-gray-500 mb-4">Available Balance</p>
        <div className="flex gap-3">
          <button onClick={() => onWithdrawClick()} className="bg-green-600 text-white px-4 py-2 rounded-md">Withdraw</button>
          <button className="bg-white border px-4 py-2 rounded-md">Transaction History</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-3">Payment Methods</h3>
        <p className="text-sm text-gray-500 mb-4">Connect UPI or bank to withdraw automatically.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between border p-3 rounded-md">
            <div>
              <p className="font-medium">UPI (Google Pay / PhonePe)</p>
              <p className="text-xs text-gray-500">Fast & secure</p>
            </div>
            <button className="px-3 py-1 rounded-md bg-green-50 text-green-700">Connect</button>
          </div>
          <div className="flex items-center justify-between border p-3 rounded-md">
            <div>
              <p className="font-medium">Bank Transfer</p>
              <p className="text-xs text-gray-500">Standard 2-3 days</p>
            </div>
            <button className="px-3 py-1 rounded-md bg-white border">Connect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Performance Section ------------------ */
function PerformanceSection({ range, setRange }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setRange('weekly')} className={`px-3 py-1 rounded-md ${range === 'weekly' ? 'bg-green-600 text-white' : 'bg-white border'}`}>Weekly</button>
        <button onClick={() => setRange('monthly')} className={`px-3 py-1 rounded-md ${range === 'monthly' ? 'bg-green-600 text-white' : 'bg-white border'}`}>Monthly</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        {range === 'weekly' ? (
          <div>
            <h3 className="font-semibold mb-3">Weekly Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceWeekly}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="jobs" fill="#10b981" name="Jobs" />
                <Bar dataKey="earnings" fill="#6366f1" name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div>
            <h3 className="font-semibold mb-3">Monthly Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceMonthly}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="jobs" fill="#10b981" name="Jobs" />
                <Bar dataKey="earnings" fill="#6366f1" name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h4 className="font-semibold mb-3">KPIs</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-md"><p className="text-sm text-gray-500">Jobs Completed</p><p className="font-bold">142</p></div>
            <div className="p-3 border rounded-md"><p className="text-sm text-gray-500">Avg Rating</p><p className="font-bold">4.8</p></div>
            <div className="p-3 border rounded-md"><p className="text-sm text-gray-500">Earnings (30d)</p><p className="font-bold">$4,320</p></div>
            <div className="p-3 border rounded-md"><p className="text-sm text-gray-500">Response Time</p><p className="font-bold">12m</p></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h4 className="font-semibold mb-3">Job Categories</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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
function HistorySection({ history }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-4">Work History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="py-2">Job</th>
              <th className="py-2">Date</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Status</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 font-medium">{h.title}</td>
                <td className="py-3 text-sm text-gray-500">{h.date}</td>
                <td className="py-3 text-sm text-gray-500">{h.customer}</td>
                <td className="py-3">
                  <Badge>{h.status}</Badge>
                </td>
                <td className="py-3 text-sm font-semibold">${h.earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------ Find Work Section (Job Board) ------------------ */
function FindWorkSection({ workerCategory, onAccept }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        // Fetch open problems. 
        // We can filter by category if we know the worker's category.
        // For now, fetching all open problems or filtering by 'General' if undefined.
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

    // Optional: Poll every 10 seconds or rely on socket 'new-problem' event in parent
    const interval = setInterval(fetchProblems, 10000);
    return () => clearInterval(interval);

  }, [workerCategory]);

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
            <div key={problem._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
              <div>
                <h4 className="font-bold text-lg text-gray-800">{problem.title}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-semibold">{problem.category}</span>
                  <span>• {problem.location?.city || "Unknown Location"}</span>
                  <span>• Posted {new Date(problem.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-gray-600 mt-2 text-sm">{problem.description}</p>
              </div>
              <button
                onClick={() => onAccept(problem._id)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md font-medium shadow-sm transition transform active:scale-95"
              >
                Accept Job
              </button>
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

/* ------------------ Payment Modal ------------------ */
function PaymentModal({ job, onClose, onConfirm }) {
  const [method, setMethod] = useState("cash");

  if (!job) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-104 shadow-lg">
        <h4 className="font-semibold mb-2">Collect Payment</h4>
        <p className="text-sm text-gray-500 mb-3">
          {job.title} • {job.customer}
        </p>
        <div className="bg-gray-50 border rounded-md p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Amount Due</span>
            <span className="font-semibold">${job.amount || 0}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium">Payment Mode</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setMethod("cash")}
              className={`px-3 py-2 rounded-md border text-sm ${method === "cash" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"}`}
            >
              Cash
            </button>
            <button
              onClick={() => setMethod("upi")}
              className={`px-3 py-2 rounded-md border text-sm ${method === "upi" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"}`}
            >
              UPI
            </button>
            <button
              onClick={() => setMethod("qr")}
              className={`px-3 py-2 rounded-md border text-sm ${method === "qr" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"}`}
            >
              QR
            </button>
          </div>
        </div>

        {(method === "upi" || method === "qr") && (
          <div className="border rounded-md p-3 mb-4">
            <p className="text-xs text-gray-500 mb-2">Scan to pay</p>
            <div className="bg-gray-100 rounded-md h-36 flex items-center justify-center text-xs text-gray-400">
              QR CODE
            </div>
            <p className="text-xs text-gray-500 mt-2">UPI ID: worker@upi</p>
          </div>
        )}

        {method === "cash" && (
          <p className="text-xs text-gray-500 mb-4">
            Cash collected from customer. Same amount will be withdrawn from worker wallet.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={() => onConfirm(method)} className="px-4 py-2 rounded-md bg-emerald-600 text-white">
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Payment Success Modal ------------------ */
function PaymentSuccessModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h4 className="font-semibold mb-2">Payment Successful</h4>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Done</button>
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


