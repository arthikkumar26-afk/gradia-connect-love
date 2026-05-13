import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Suppress non-critical unhandled rejections (React HMR + network errors)
window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || "";
  const name = event.reason?.name || "";
  if (
    msg.includes("Should have a queue") ||
    msg.includes("bug in React") ||
    msg.includes("NetworkError") ||
    msg.includes("Failed to fetch") ||
    name === "TypeError"
  ) {
    console.warn("Suppressed unhandled rejection:", msg || name);
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
