import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../../../config/api";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const [problem, setProblem] = useState(state.problem || null);
  const problemId = state.problemId || problem?._id || null;

  const initialAmount = useMemo(() => {
    if (typeof state.amount === "number") return String(state.amount);
    if (typeof state.problem?.amount === "number") return String(state.problem.amount);
    if (typeof problem?.amount === "number") return String(problem.amount);
    return "";
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

  useEffect(() => {
    if (problem || !problemId) return;

    const fallbackState = location.state?.problem || location.state?.currentProblem;
    if (fallbackState) {
      setProblem(fallbackState);
      if (typeof fallbackState.amount === "number") {
        setAmount(String(fallbackState.amount));
      }
    }
  }, [location.state, problem, problemId]);

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
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert("Payment amount is missing");
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

      // Handle mock mode (when credentials are invalid)
      if (orderData.isMockMode) {
        console.log("🎭 MOCK MODE: Simulating payment...");
        alert("💡 Running in Mock Mode\n\nThis is a test payment that will succeed without real Razorpay credentials.\n\nWhen you add real credentials, it will use Razorpay.");
        
        // Simulate payment success after 2 seconds
        setTimeout(async () => {
          try {
            if (problemId) {
              await fetch(`${API_BASE_URL}/api/problems/${problemId}/payment-success`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentId: `mock_payment_${Date.now()}`,
                  amount: parsedAmount,
                }),
              });
            }

            alert("✅ Mock Payment Successful!");
            navigate("/user");
          } catch (error) {
            console.error("Mock payment update failed:", error);
            alert("Mock payment simulation complete. Please refresh to see updates.");
          } finally {
            setLoading(false);
          }
        }, 2000);
        return;
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
        description: problem?.title || "Service Payment",
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            if (problemId) {
              await fetch(`${API_BASE_URL}/api/problems/${problemId}/payment-success`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                  amount: parsedAmount,
                }),
              });
            }

            alert("Payment successful");
            navigate("/user");
          } catch (error) {
            console.error("Payment success update failed:", error);
            alert("Payment was captured, but status update failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: state.worker?.name || "",
          email: state.worker?.email || "",
        },
        theme: {
          color: "#0b2545",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment flow failed:", error);
      alert(error.message || "Payment flow failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h1 className="text-2xl font-bold text-gray-900">Payment</h1>
      <p className="text-sm text-gray-600 mt-1">
        Complete your payment after OTP verification.
      </p>

      {problem?.title && (
        <p className="mt-4 text-sm text-gray-700">
          <span className="font-semibold">Service:</span> {problem.title}
        </p>
      )}

      <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-600">Fixed amount to pay</p>
        <p className="text-2xl font-bold text-gray-900">INR {amount || "0"}</p>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="mt-5 w-full bg-[#0b2545] hover:bg-[#14365b] text-white font-semibold py-2.5 rounded-md transition-colors disabled:opacity-70"
      >
        {loading ? "Opening Razorpay..." : "Pay fixed amount with Razorpay"}
      </button>
    </div>
  );
}

export default Payment;