import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyJobs from "./tools/list-my-jobs";
import listMyApplications from "./tools/list-my-applications";
import searchJobs from "./tools/search-jobs";

// OAuth issuer must be the direct Supabase host, built from the project ref
// (SUPABASE_URL may point at a .lovable.cloud proxy). VITE_ vars are inlined at
// build time so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gradia-mcp",
  title: "Gradia",
  version: "0.1.0",
  instructions:
    "Tools for Gradia — a hiring and career platform. Callers act as the signed-in Gradia user (candidate, employer, HR, etc.). Use `get_my_profile` to identify the user, `search_jobs` to find open roles, `list_my_jobs` for an employer's postings, and `list_my_applications` for a candidate's applications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, searchJobs, listMyJobs, listMyApplications],
});
