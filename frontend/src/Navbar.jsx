import React from 'react'
import Sign from "./Sign";
import { useState } from 'react';
import { useNavigate, Route, Routes} from 'react-router-dom';
// import home from './main'
function Navbar() {
    const [email, setEmail] = useState("");
    const navigate = useNavigate(); 
    const scrollToFeatures = () => {
        document.getElementById("features-section").scrollIntoView({ behavior: "smooth" });
    };
  return (
    <div className="w-full">
      <header className="w-full flex justify-between items-center py-6 px-8 max-w-7xl mx-auto">
        {/* Left side - Brand name */}
        <a href="/">
          <h1 className="text-2xl font-bold text-[#0b2545]">EzyWork</h1>
        </a>
        
        {/* Right side - Navigation and Auth buttons */}
        <div className="flex items-center gap-8">
          <nav className="flex gap-8 text-gray-700 items-center">
            <button onClick={scrollToFeatures} className="hover:text-black">
              Features
            </button>
          </nav>
          <div className="flex gap-8 items-center">
            <button className="text-gray-700 hover:text-black transition-colors" >
              History
            </button>
            <button
              className="bg-[#0b2545] text-white px-6 py-2 rounded-md hover:bg-[#14365b] transition-colors"
              onClick={() => navigate("/sign")}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}

export default Navbar

