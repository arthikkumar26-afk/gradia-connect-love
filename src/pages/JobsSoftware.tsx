import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Redirect to jobs-results with software filter
export default function JobsSoftware() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/jobs-results?q=software', { replace: true });
  }, [navigate]);

  return null;
}
