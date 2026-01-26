import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Authentication from "./context/Authentication.jsx";
import User from "./User.jsx";
import Worker from "./Worker.jsx";
import Sign from "./Sign"; // Import Sign component
import WorkerDetails from "./WorkerDetails"; // Import WorkerDetails component
import Payment from "./Payment.jsx";
import Navbar from "./Navbar.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* <Route path='/' /> */}
        <Route path="/" element={<App />} />
        <Route path="/authentication" element={<Authentication />} />
        <Route path="/user" element={<User />} />
        <Route path="/worker" element={<Worker />} />
        <Route path="/worker-details" element={<WorkerDetails />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/sign" element={<Sign />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
