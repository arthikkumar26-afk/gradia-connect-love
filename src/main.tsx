import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent "Should have a queue" React HMR errors from crashing the app
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes("Should have a queue") ||
    event.reason?.message?.includes("bug in React")
  ) {
    console.warn("Suppressed React HMR error:", event.reason?.message);
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
