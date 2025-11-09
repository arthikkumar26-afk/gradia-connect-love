import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

// Redirect /jobs to /jobs-results for browse jobs functionality
export default function Jobs() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/jobs-results', { replace: true });
  }, [navigate]);

  return null;
}
