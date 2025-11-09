import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Redirect to jobs-results with education filter
export default function JobsEducation() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/jobs-results?q=education', { replace: true });
  }, [navigate]);

  return null;
}
