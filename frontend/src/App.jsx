import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import { Routes, Route } from "react-router-dom"; // Added for routing
import "./App.css";
import WorkerImage from "../Photos/Worker.png";
import WorkerDetails from "./WorkerDetails"; // Import WorkerDetails component
import Sign from "./Sign";
import Navbar from "./Navbar";


function App() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate(); // Hook for navigation

  const scrollToFeatures = () => {
    document.getElementById("features-section").scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-6 md:px-16">
      <Navbar />

      {/* <header className="w-full flex justify-between items-center py-6 max-w-7xl">
        <a href="#"><h1 className="text-2xl font-bold text-[#0b2545]">EzyWork</h1></a>
        <nav className="flex gap-8 text-gray-700">
          <a href="#" className="hover:text-black">Home</a>
          <button onClick={scrollToFeatures} className="hover:text-black">
            Features
          </button>
        </nav>
        <div className="flex gap-4">
          <button className="text-gray-700" onClick={() => navigate("/sign")}>
            Login
          </button>
          <button
            className="bg-[#0b2545] text-white px-4 py-2 rounded-md hover:bg-[#14365b]"
            onClick={() => navigate("/sign")}
          >
            Sign Up
          </button>
        </div>
      </header> */}

      {/* Hero Section */}
      <main className="flex flex-col md:flex-row justify-between items-center w-full max-w-7xl py-12">
        {/* Left Text */}
        <div className="flex flex-col gap-6 max-w-lg">
          <h2 className="text-5xl md:text-6xl font-bold text-[#0b2545] leading-tight">
            Simplify Your Work – AI Finds the Right Expert for You
          </h2>
          <p className="text-gray-600 text-lg">
            From plumbing to electrical, cleaning to carpentry — EzyWork connects
            you with trusted local professionals in seconds using AI-powered matching.
          </p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/user")} className="bg-[#0b2545] text-white px-5 py-3 rounded-md hover:bg-[#14365b]">
              Find a Worker
            </button>
            <button onClick={() => navigate("/sign")} className="bg-gray-200 text-[#0b2545] px-5 py-3 rounded-md hover:bg-gray-300">
              Join as a Worker
            </button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="mt-10 md:mt-0 md:ml-12">
          <div className="border-4 border-gray-300 rounded-lg shadow-lg overflow-hidden">
            <img
              src={WorkerImage}
              alt="Worker Illustration"
              className="w-full max-w-md object-cover"
            />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features-section" className="w-full max-w-7xl py-12">
        <h3 className="text-4xl font-bold text-center text-[#0b2545] mb-8">
          Why Choose EzyWork?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-[#0b2545] mb-2">
              AI-Powered Problem Detection
            </h4>
            <p className="text-gray-600">
              Just describe your issue — our smart system understands it and finds
              the right professional.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-[#0b2545] mb-2">
              Verified & Rated Workers
            </h4>
            <p className="text-gray-600">
              Every worker is verified, rated, and reviewed for quality service you
              can trust.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-[#0b2545] mb-2">
              Flexible Payment Options
            </h4>
            <p className="text-gray-600">
              Book and Pay instantly or Pay later — your choice, your comfort.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-[#0b2545] mb-2">
              Secure OTP Job Completion
            </h4>
            <p className="text-gray-600">
              Work is only marked complete when you confirm via OTP, ensuring total
              trust and transparency.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-[#0b2545] mb-2">
              Real-Time Tracking & Feedback
            </h4>
            <p className="text-gray-600">
              Track your worker’s location live and share your experience instantly
              after completion.
            </p>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <footer className="w-full max-w-7xl py-12 text-center">
        <h4 className="text-3xl font-bold text-[#0b2545] mb-4">
          Ready to get your work done the smart way?
        </h4>
        <p className="text-gray-600 mb-6">
          Join EzyWork today and experience effortless service at your doorstep.
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={() => navigate("/sign")} className="bg-[#0b2545] text-white px-5 py-3 rounded-md hover:bg-[#14365b]">
            🚀 Get Started
          </button>
          <button className="bg-gray-200 text-[#0b2545] px-5 py-3 rounded-md hover:bg-gray-300">
            👷 Become a Partner
          </button>
        </div>
      </footer>

      {/* Routes */}
      <Routes>
        <Route path="/sign" element={<Sign />} />
        <Route path="/worker-details" element={<WorkerDetails />} />
        {/* Add other routes here */}
      </Routes>
    </div>
  );
}

export default App;
