// Preloads all admin-route code chunks in the background so navigating between
// admin pages is instant and avoids stale-chunk failures after redeploys.

const adminImports: Array<() => Promise<unknown>> = [
  () => import("@/pages/admin/Dashboard"),
  () => import("@/pages/admin/JobModeration"),
  () => import("@/pages/admin/Users"),
  () => import("@/pages/admin/Companies"),
  () => import("@/pages/admin/Reports"),
  () => import("@/pages/admin/AuditLogs"),
  () => import("@/pages/admin/AdminSettings"),
  () => import("@/pages/admin/SubscribedEmployers"),
  () => import("@/pages/admin/SubscribedCandidates"),
  () => import("@/pages/admin/UnsubscribedEmployers"),
  () => import("@/pages/admin/UnsubscribedCandidates"),
  () => import("@/pages/admin/MockInterviewPipeline"),
  () => import("@/pages/admin/Management"),
  () => import("@/pages/admin/ManagementFeedback"),
  () => import("@/pages/admin/LiveDemoView"),
  
  () => import("@/pages/admin/CouponManagement"),
  () => import("@/pages/admin/ExternalJobs"),
  () => import("@/pages/admin/EventAlerts"),
  () => import("@/pages/admin/PopupAds"),
  () => import("@/pages/admin/BulkMailRegister"),
  () => import("@/pages/admin/AIFlyerMaker"),
  () => import("@/pages/admin/InviteFromResume"),
  () => import("@/pages/admin/CandidateResumes"),
];

let preloadStarted = false;

export const preloadAdminChunks = () => {
  if (preloadStarted) return;
  preloadStarted = true;

  const run = () => {
    adminImports.forEach((load, idx) => {
      // Stagger slightly so we don't saturate the network at once
      setTimeout(() => {
        load().catch(() => {
          /* swallow — lazyWithRetry will handle real navigations */
        });
      }, idx * 40);
    });
  };

  // Use requestIdleCallback when available so we don't compete with critical work
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (typeof ric === "function") {
    ric(run, { timeout: 2000 });
  } else {
    setTimeout(run, 500);
  }
};
