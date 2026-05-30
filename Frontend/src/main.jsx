import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App.jsx";
import "./index.css";

// Set axios baseURL globally:
// - In production (Vercel), VITE_API_URL = https://agro-connect-fyp.onrender.com
// - In local dev, leave empty so Vite proxy handles /api/* calls
axios.defaults.baseURL = (import.meta.env.VITE_API_URL || "https://agro-connect-fyp.onrender.com").replace(/\/$/, "");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
