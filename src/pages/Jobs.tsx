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
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Browse Jobs - Gradia" />
        <meta property="og:description" content="Browse active job openings across software and education sectors on Gradia." />
        <meta property="og:url" content="https://gradia.world/jobs" />
        <meta property="og:image" content="https://gradia.world/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Browse Jobs - Gradia" />
        <meta name="twitter:description" content="Browse active job openings across software and education sectors on Gradia." />
        <meta name="twitter:image" content="https://gradia.world/og-image.png" />
      </Helmet>
    </>
  );
}
