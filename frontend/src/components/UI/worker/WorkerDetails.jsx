import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

function WorkerDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [workerDetails, setWorkerDetails] = useState({
    fullName: "",
    location: "",
    yearsOfExperience: "",
    typeOfWork: [],
    mobileNumber: "",
    email: ""
  });

  // Pre-populate email from signup or logged-in user
  useEffect(() => {
    if (location.state?.email) {
      // Redirected from signup
      setWorkerDetails((prev) => ({
        ...prev,
        email: location.state.email,
        fullName: location.state.name || "",
      }));
    } else if (isAuthenticated && user?.email) {
      // Already logged in
      setWorkerDetails((prev) => ({
        ...prev,
        email: user.email,
      }));
    }
  }, [location.state, isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setWorkerDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeOfWorkChange = (e) => {
    const options = Array.from(e.target.selectedOptions, (option) => option.value);
    setWorkerDetails((prev) => ({
      ...prev,
      typeOfWork: options,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch("http://localhost:5000/api/workers/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workerDetails),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Worker details saved successfully!");
        navigate("/worker");
      } else {
        alert(data.message || "Failed to save worker details");
      }
    } catch (error) {
      console.error("Error saving worker details:", error);
      alert("An error occurred while saving worker details");
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col items-center justify-center px-6 md:px-16">
      <div className="absolute top-4 left-4">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-gray-100 rounded-lg shadow-md hover:shadow-lg hover:bg-[#1e293b] transition-all border border-slate-700"
        >
          <Home size={20} />
          Back to Home
        </button>
      </div>
      <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
        <h2 className="text-3xl font-bold text-green-500 text-center mb-6">
          Complete Your Profile
        </h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            name="fullName"
            value={workerDetails.fullName}
            onChange={handleChange}
            className="px-4 py-3 bg-[#1e293b] border border-slate-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="text"
            placeholder="Location"
            name="location"
            value={workerDetails.location}
            onChange={handleChange}
            className="px-4 py-3 bg-[#1e293b] border border-slate-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="number"
            placeholder="Years of Experience"
            name="yearsOfExperience"
            value={workerDetails.yearsOfExperience}
            onChange={handleChange}
            className="px-4 py-3 bg-[#1e293b] border border-slate-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
          type="tel"
          placeholder="Enter your contact number"
          name="mobileNumber"
          value={workerDetails.mobileNumber}
          pattern="[0-9]{10}"
          maxLength={10}
          onChange={handleChange}
          className="px-4 py-3 bg-[#1e293b] border border-slate-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" required></input>
          <input
          type="email"
          placeholder="Enter your email id"
          name="email"
          value={workerDetails.email}
          pattern="[a-zA-Z0-9.-_+%]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
          onChange={handleChange}
          readOnly
          className="px-4 py-3 bg-[#1e293b] border border-slate-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 cursor-not-allowed opacity-75" required></input>
          <select
            name="typeOfWork"
            value={workerDetails.typeOfWork}
            onChange={handleTypeOfWorkChange}
            className="px-4 py-3 bg-[#1e293b] border border-slate-700 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="" className="bg-[#1e293b]">Select type of work</option>
            <option value="Plumber" className="bg-[#1e293b]">Plumber</option>
            <option value="Electrician" className="bg-[#1e293b]">Electrician</option>
            <option value="Carpenter" className="bg-[#1e293b]">Carpenter</option>
            <option value="Painter" className="bg-[#1e293b]">Painter</option>
            <option value="Welder" className="bg-[#1e293b]">Welder</option>
            <option value="Mechanic" className="bg-[#1e293b]">Mechanic</option>
            <option value="Driver" className="bg-[#1e293b]">Driver</option>
          </select>

          <button className="bg-green-600 text-white py-3 rounded-md hover:bg-green-700 font-semibold transition-all">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default WorkerDetails;