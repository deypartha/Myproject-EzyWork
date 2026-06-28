import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../../../config/api";
import { FaShieldAlt, FaCheckCircle, FaUser, FaTools, FaReceipt, FaArrowLeft, FaCreditCard, FaClock } from "react-icons/fa";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const [problem, setProblem] = useState(state.problem || null);
  const problemId = state.problemId || problem?._id || null;
  const worker = state.worker || problem?.assignedWorker || null;
  const paymentDone = problem?.paymentStatus === "completed";

  const initialAmount = useMemo(() => {
    if (typeof state.amount === "number") return String(state.amount);
    if (typeof state.problem?.amount === "number") return String(state.problem.amount);
    if (typeof problem?.amount === "number") return String(problem.amount);
    return "350"; // Default professional fallback
  }, [problem, state.amount, state.problem]);

  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (problem || !problemId) return;

    const loadProblem = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/problems/${problemId}`);
        if (res.ok) {
          const data = await res.json();
          setProblem(data);
          if (typeof data.amount === "number") {
            setAmount(String(data.amount));
          }
        }
      } catch (error) {
        console.error("Failed to load problem for payment:", error);
      }
    };

    loadProblem();
  }, [problem, problemId]);

  useEffect(() => {
    if (!problemId) return;

    const loadPaymentConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/problems/${problemId}/payment-config`);
        if (!res.ok) return;

        const data = await res.json();
        if (data?.problem) {
          setProblem(data.problem);
        }
        if (typeof data.amount === "number") {
          setAmount(String(data.amount));
        }
      } catch (error) {
        console.error("Failed to load payment config:", error);
      }
    };

    loadPaymentConfig();
  }, [problemId]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_URL;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (paymentDone) {
      alert("This booking is already paid.");
      navigate("/user");
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert("Payment amount is missing or invalid");
      return;
    }

    setLoading(true);

    try {
      const orderRes = await fetch(`${API_BASE_URL}/api/problems/${problemId}/payment-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || "Failed to create payment order");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay SDK");
      }

      const razorpayKey = orderData.keyId;
      if (!razorpayKey) {
        throw new Error("Razorpay key missing from order response");
      }

      const options = {
        key: razorpayKey,
        amount: Math.round(parsedAmount * 100),
        currency: orderData.currency || "INR",
        name: "EzyWork",
        description: problem?.title || "Professional Service Booking",
        handler: async function (response) {
          try {
            if (problemId) {
              await fetch(`${API_BASE_URL}/api/problems/${problemId}/payment-success`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                  amount: parsedAmount,
                }),
              });
            }

            alert("🎉 Payment Successful! Booking Confirmed.");
            navigate("/user");
          } catch (error) {
            console.error("Payment success update failed:", error);
            alert("Payment was processed, but status update encountered an error. Please refresh your dashboard.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: worker?.name || "Customer",
          email: worker?.email || "",
        },
        theme: {
          color: "#3b82f6",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (!orderData.isMockMode && orderData.orderId) {
        options.order_id = orderData.orderId;
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment flow failed:", error);
      alert(error.message || "Payment processing failed. Please try again.");
      setLoading(false);
    }
  };

  const numericAmount = Number(amount) || 350;
  const serviceFee = Math.round(numericAmount * 0.9);
  const platformFee = numericAmount - serviceFee;

  return (
    <div className="mx-auto my-8 max-w-3xl px-4 sm:px-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
      >
        <FaArrowLeft /> Back to Dashboard
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-6 sm:px-8 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                <FaShieldAlt className="text-blue-400" /> Secure Checkout
              </span>
              <h1 className="mt-2 text-2xl font-bold text-white tracking-tight">Complete Payment</h1>
              <p className="text-xs text-slate-400 mt-1">Order Ref: #{problemId ? problemId.substring(0, 8) : "EZY-8849"}</p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs text-slate-400">Total Due</span>
              <p className="text-3xl font-extrabold text-white">₹{numericAmount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-12">
          {/* Left Column: Details */}
          <div className="md:col-span-7 space-y-6">
            {/* Service Details */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FaTools className="text-blue-400" /> Service Summary
              </h3>
              <div>
                <p className="text-lg font-bold text-white">{problem?.title || "Professional On-Demand Service"}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{problem?.description || "Verified expert service with completion guarantee."}</p>
              </div>
            </div>

            {/* Assigned Professional */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FaUser className="text-emerald-400" /> Assigned Expert
              </h3>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                  {(worker?.name || problem?.assignedWorker?.name || "Verified Worker").charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white">{worker?.name || problem?.assignedWorker?.name || "Verified Professional"}</p>
                  <p className="text-xs text-slate-400">{worker?.skills?.join(", ") || worker?.skill || "Specialist Worker"}</p>
                  <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                    <FaCheckCircle className="text-xs" /> Verified Partner
                  </p>
                </div>
              </div>
            </div>

            {/* Itemized Bill */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FaReceipt className="text-amber-400" /> Fare Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Standard Service Fee</span>
                  <span className="font-medium text-white">₹{serviceFee}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Safety & Platform Convenience Fee</span>
                  <span className="font-medium text-white">₹{platformFee}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-base text-white">
                  <span>Total Amount</span>
                  <span className="text-blue-400">₹{numericAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Action Box */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-[#0f172a] p-6 shadow-lg">
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20 text-center">
                <span className="text-xs text-blue-300 font-medium uppercase tracking-wider">Payment Status</span>
                <p className={`mt-1 text-lg font-bold ${paymentDone ? "text-emerald-400" : "text-amber-400"}`}>
                  {paymentDone ? "✓ Completed" : "⚡ Awaiting Payment"}
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex items-center gap-2.5">
                  <FaShieldAlt className="text-blue-400 shrink-0 text-sm" />
                  <span>256-Bit Encrypted SSL Connection</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FaCreditCard className="text-indigo-400 shrink-0 text-sm" />
                  <span>Supports UPI, Cards, NetBanking & Wallets</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FaClock className="text-emerald-400 shrink-0 text-sm" />
                  <span>Instant Payment Confirmation</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={handlePayment}
                disabled={loading || paymentDone}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paymentDone ? (
                  <>
                    <FaCheckCircle /> Payment Completed
                  </>
                ) : loading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Connecting Razorpay...
                  </>
                ) : (
                  <>
                    <FaCreditCard /> Pay ₹{numericAmount} Now
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500">
                Powered by Razorpay Secure Gateway
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment;