import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function WorkerDetails() {
  const [workerDetails, setWorkerDetails] = useState({
    fullName: "",
    location: "",
    yearsOfExperience: "",
    typeOfWork: [],
  });

  const navigate = useNavigate();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(workerDetails); // Replace with API call or other logic
    navigate("/worker");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1220] flex flex-col items-center justify-center px-6 md:px-16">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-[#0b2545] text-center mb-6">
          Complete Your Profile
        </h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            name="fullName"
            value={workerDetails.fullName}
            onChange={handleChange}
            className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
          />
          <input
            type="text"
            placeholder="Location"
            name="location"
            value={workerDetails.location}
            onChange={handleChange}
            className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
          />
          <input
            type="number"
            placeholder="Years of Experience"
            name="yearsOfExperience"
            value={workerDetails.yearsOfExperience}
            onChange={handleChange}
            className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
          />
          <select
            multiple
            name="typeOfWork"
            value={workerDetails.typeOfWork}
            onChange={handleTypeOfWorkChange}
            className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b2545] h-32"
          >
            <option value="Plumber">Plumber</option>
            <option value="Electrician">Electrician</option>
            <option value="Carpenter">Carpenter</option>
            <option value="Painter">Painter</option>
            <option value="Welder">Welder</option>
            <option value="Mechanic">Mechanic</option>
            <option value="Driver">Driver</option>
          </select>
          <button className="bg-[#0b2545] text-white py-3 rounded-md hover:bg-[#14365b] font-semibold">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default WorkerDetails;