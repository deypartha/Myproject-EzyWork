import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
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
  const [workers, setWorkers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Define menuItems array
  const menuItems = [
    { key: "job", icon: <Users size={18} />, label: "Job Management" },
    { key: "wallet", icon: <Wallet size={18} />, label: "Wallet & Earnings" },
    { key: "performance", icon: <Star size={18} />, label: "Performance Analytics" },
    { key: "availability", icon: <Calendar size={18} />, label: "Availability & Schedule" },
    { key: "security", icon: <ShieldAlert size={18} />, label: "Security & Communication" },
    { key: "history", icon: <Briefcase size={18} />, label: "Work History" },
    { key: "browse", icon: <Users size={18} />, label: "Browse Workers" },
  ];

  // Fetch worker's location on dashboard load
  useEffect(() => {
    const fetchLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const locationData = await fetchCityAndCountry(latitude, longitude);
            setWorkerLocation({
              latitude,
              longitude,
              city: locationData.city,
              country: locationData.country,
            });
          },
          (error) => {
            console.error("Unable to fetch location:", error);
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    };

    fetchLocation();
  }, []);

  // Fetch workers based on category
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        let url = "http://localhost:5000/api/workers/all";
        if (selectedCategory) {
          url = `http://localhost:5000/api/workers/type/${selectedCategory}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        setWorkers(data);
      } catch (error) {
        console.error("Error fetching workers:", error);
      }
    };

    if (activeSection === "browse") {
      fetchWorkers();
    }
  }, [selectedCategory, activeSection]);

  // Fetch city and country using reverse geocoding API
  const fetchCityAndCountry = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://geocode.xyz/${latitude},${longitude}?geoit=json`
      );
      const data = await response.json();
      return { city: data.city || "Unknown", country: data.country || "Unknown" };
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
    // In real app verify on server. Here we accept '0000' as valid OTP for demo.
    if (otpValue.trim() === "0000") {
      setHistory((h) =>
        h.map((j) => (j.id === jobId ? { ...j, status: "otp-verified" } : j))
      );
      setOtpModal({ open: false, jobId: null });
      setPaymentModal({ open: true, jobId });
    } else {
      alert("Invalid OTP. Try 0000 for demo.");
    }
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
  function submitFraudReport(details) {
    setFraudReportOpen(false);
    alert("Fraud report submitted. Support will contact you shortly.");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0b1220] dark:text-gray-100">
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
                className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded-md transition font-medium text-sm ${
                  activeSection === item.key
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
              onClick={() => setOnline((s) => !s)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                online ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
              aria-pressed={online}
            >
              {online ? "Online" : "Go Online"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button className="text-sm text-gray-600 hover:text-gray-800">Settings</button>
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
        {activeSection === "browse" && (
          <BrowseWorkersSection 
            workers={workers} 
            selectedCategory={selectedCategory} 
            setSelectedCategory={setSelectedCategory} 
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
      <div className="space-y-3">
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between border p-3 rounded-md">
            <div>
              <div className="font-medium">{h.title} <span className="text-xs text-gray-400">{h.date}</span></div>
              <div className="text-sm text-gray-500">{h.customer} • {h.location}</div>
              <div className="text-xs text-gray-400">Amount: ${h.amount || 0}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{h.status === 'completed' ? `$${h.earned}` : <span className="text-sm text-gray-500">{h.status === 'otp-verified' ? 'payment pending' : h.status}</span>}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------ OTP Modal ------------------ */
function OtpModal({ jobId, onClose, onVerify }) {
  const [otp, setOtp] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h4 className="font-semibold mb-2">Enter OTP to complete job</h4>
        <p className="text-sm text-gray-500 mb-4">Ask the customer for the 4-digit OTP and enter it here.</p>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" className="w-full border rounded-md px-3 py-2 mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={() => onVerify(otp)} className="px-4 py-2 rounded-md bg-green-600 text-white">Verify & Complete</button>
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
      <div className="bg-white p-6 rounded-lg w-[26rem] shadow-lg">
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

/* ------------------ Browse Workers Section ------------------ */
function BrowseWorkersSection({ workers, selectedCategory, setSelectedCategory }) {
  const [searchQuery, setSearchQuery] = useState("");
  const categories = [
    { label: "Plumber", keywords: ["plumber", "plumbing", "pipe"] },
    { label: "Electrician", keywords: ["electrician", "electrical", "wiring"] },
    { label: "Carpenter", keywords: ["carpenter", "carpentry", "wood"] },
    { label: "Painter", keywords: ["painter", "painting", "paint"] },
    { label: "Welder", keywords: ["welder", "welding", "weld"] },
    { label: "Mechanic", keywords: ["mechanic", "mechanical", "repair"] },
    { label: "Driver", keywords: ["driver", "driving", "chauffeur"] },
  ];

  const matchedCategoryLabel = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return "";
    const match = categories.find((category) =>
      category.keywords.some((keyword) => query.includes(keyword))
    );
    return match ? match.label : "";
  }, [searchQuery]);

  useEffect(() => {
    if (matchedCategoryLabel && matchedCategoryLabel !== selectedCategory) {
      setSelectedCategory(matchedCategoryLabel);
      return;
    }
    if (!searchQuery.trim() && selectedCategory) {
      setSelectedCategory("");
    }
  }, [matchedCategoryLabel, searchQuery, selectedCategory, setSelectedCategory]);

  const filteredWorkers = useMemo(() => {
    if (!selectedCategory) return workers;
    const selected = selectedCategory.toLowerCase();
    return workers.filter((worker) => {
      const skills = Array.isArray(worker.typeOfWork) ? worker.typeOfWork : [];
      const extraSkills = Array.isArray(worker.skills) ? worker.skills : [];
      const allSkills = [...skills, ...extraSkills].map((s) => String(s).toLowerCase());
      return allSkills.some((skill) => skill.includes(selected));
    });
  }, [workers, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Search + Filter by Category */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-4">Search or Filter by Category</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. I need a painter"
            className="w-full md:flex-1 border rounded-md px-3 py-2"
          />
          <button
            onClick={() => setSearchQuery("")}
            className="px-4 py-2 rounded-md border bg-white"
          >
            Clear
          </button>
        </div>
        {matchedCategoryLabel ? (
          <p className="text-sm text-gray-600 mb-4">
            Detected role: <strong>{matchedCategoryLabel}</strong>. Showing all {matchedCategoryLabel.toLowerCase()}s.
          </p>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            Try natural language like “I need a painter”.
          </p>
        )}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-4 py-2 rounded-md ${
              selectedCategory === "" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            All Workers
          </button>
          {categories.map((category) => (
            <button
              key={category.label}
              onClick={() => setSelectedCategory(category.label)}
              className={`px-4 py-2 rounded-md ${
                selectedCategory === category.label ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workers List */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold mb-4">
          {selectedCategory ? `${selectedCategory}s` : "All Workers"} ({filteredWorkers.length})
        </h3>
        
        {filteredWorkers.length === 0 ? (
          <p className="text-gray-500">No workers found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map((worker) => (
              <div key={worker._id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{worker.fullName || worker.name}</h4>
                    <p className="text-sm text-gray-500">{worker.location || "Location not specified"}</p>
                  </div>
                  <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                    {worker.yearsOfExperience || 0} yrs
                  </div>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-gray-500" />
                    <span>{worker.mobileNumber || worker.number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-gray-500" />
                    <span>{worker.email}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Skills:</p>
                  <div className="flex gap-2 flex-wrap">
                    {worker.typeOfWork && worker.typeOfWork.length > 0 ? (
                      worker.typeOfWork.map((skill, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No skills listed</span>
                    )}
                  </div>
                </div>

                <button className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition text-sm">
                  Contact Worker
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
