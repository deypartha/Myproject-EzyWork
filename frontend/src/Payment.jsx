import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Payment() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const worker = state?.worker;
  const problem = state?.problem;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1220] flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-[#0b2545]">Payment</h2>
        {worker ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div>
                <p className="font-semibold">{worker.name}</p>
                <p className="text-sm text-gray-600">{worker.skill}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-2">Problem: <strong>{problem}</strong></p>
            <p className="text-gray-600 mb-6">Amount: <strong>{worker.price || "$50"}</strong></p>
            <button
              onClick={() => navigate(-1)}
              className="mr-3 bg-gray-200 text-[#0b2545] px-4 py-2 rounded-md hover:bg-gray-300 font-semibold"
            >
              Back
            </button>
            <button
              onClick={() => alert("Payment flow placeholder — integrate gateway here")}
              className="bg-[#0b2545] text-white px-4 py-2 rounded-md hover:bg-[#14365b] font-semibold"
            >
              Pay Now
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">No worker selected.</p>
            <button
              onClick={() => navigate(-1)}
              className="bg-[#0b2545] text-white px-4 py-2 rounded-md hover:bg-[#14365b] font-semibold"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
