import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

// Redirect /jobs to /jobs-results for browse jobs functionality
export default function Jobs() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/jobs-results', { replace: true });
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Browse Jobs - Gradia</title>
        <meta name="description" content="Browse active job openings across software and education sectors on Gradia." />
        <link rel="canonical" href="https://gradiaa.com/jobs" />
      </Helmet>
    </>
  );
}
