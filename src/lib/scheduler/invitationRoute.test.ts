import { describe, it, expect } from "vitest";
import {
  resolveInvitationRoute,
  assertInvitationRoute,
} from "./invitationRoute";

describe("resolveInvitationRoute", () => {
  // ─────────────────────────────────────────────────────────────────────
  // Multi-slot live-meeting stages → send-demo-slot-confirmation
  // ─────────────────────────────────────────────────────────────────────
  it.each([
    ["Demo Round", "demo_round"],
    ["demo round (live)", "demo_round"],
    ["HR Round", "hr_round"],
    ["HR Negotiation", "hr_round"],
    ["Segment Interview", "segment_round"],
    ["Admin & Academic Round", "admin_academic_round"],
    ["Core Team Interview", "core_team_round"],
    ["Management Round", "management_round"],
  ])("routes %s to send-demo-slot-confirmation as multi-slot (bookingType=%s)", (stage, bookingType) => {
    const route = resolveInvitationRoute(stage);
    expect(route.functionName).toBe("send-demo-slot-confirmation");
    expect(route.isMultiSlot).toBe(true);
    expect(route.bookingType).toBe(bookingType);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Written Test → pipeline gateway, normalized stage name
  // ─────────────────────────────────────────────────────────────────────
  it("routes Written Test to send-pipeline-email with the canonical stage name", () => {
    const route = resolveInvitationRoute("Written Round Test");
    expect(route.functionName).toBe("send-pipeline-email");
    expect(route.stageName).toBe("Written Test");
    expect(route.emailType).toBe("interview_invitation");
    expect(route.bookingType).toBe("written_test");
    expect(route.isMultiSlot).toBe(false);
  });

  it("normalizes lowercase 'written test' to canonical stage name", () => {
    const route = resolveInvitationRoute("written test");
    expect(route.functionName).toBe("send-pipeline-email");
    expect(route.stageName).toBe("Written Test");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Technical / AI / unknown single-slot stages → send-interview-invitation
  // ─────────────────────────────────────────────────────────────────────
  it.each([
    "Technical Assessment",
    "Technical Round",
    "AI Interview",
    "Coding Test",
    "Aptitude Test",
    "Some Brand New Stage",
  ])("routes %s to send-interview-invitation by default", (stage) => {
    const route = resolveInvitationRoute(stage);
    expect(route.functionName).toBe("send-interview-invitation");
    expect(route.bookingType).toBe("technical_assessment");
    expect(route.isMultiSlot).toBe(false);
    expect(route.stageName).toBe(stage); // not renamed
  });

  // ─────────────────────────────────────────────────────────────────────
  // Feedback stages must NEVER hit a test-link function
  // ─────────────────────────────────────────────────────────────────────
  it.each([
    "Demo Feedback",
    "HR Feedback",
    "Management Feedback",
  ])("never routes %s to a test-link function", (stage) => {
    const route = resolveInvitationRoute(stage);
    expect(route.functionName).not.toBe("send-pipeline-email");
    expect(route.functionName).not.toBe("send-interview-invitation");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────────────────
  it("falls back to send-interview-invitation for empty/whitespace stage names", () => {
    expect(resolveInvitationRoute("").functionName).toBe("send-interview-invitation");
    expect(resolveInvitationRoute("   ").functionName).toBe("send-interview-invitation");
  });

  it("is case-insensitive on stage matching", () => {
    expect(resolveInvitationRoute("WRITTEN TEST").functionName).toBe("send-pipeline-email");
    expect(resolveInvitationRoute("hr round").functionName).toBe("send-demo-slot-confirmation");
  });
});

describe("assertInvitationRoute", () => {
  it("returns the route when the intended function matches", () => {
    const route = assertInvitationRoute("Technical Assessment", "send-interview-invitation");
    expect(route.functionName).toBe("send-interview-invitation");
  });

  it("throws when Technical Assessment is mistakenly routed via the Written Test gateway", () => {
    expect(() =>
      assertInvitationRoute("Technical Assessment", "send-pipeline-email"),
    ).toThrow(/Invitation routing mismatch/);
  });

  it("throws when Written Test is mistakenly sent through the direct invitation function", () => {
    expect(() =>
      assertInvitationRoute("Written Test", "send-interview-invitation"),
    ).toThrow(/Invitation routing mismatch/);
  });

  it("throws when a multi-slot HR booking is mistakenly sent through the test-link function", () => {
    expect(() =>
      assertInvitationRoute("HR Round", "send-interview-invitation"),
    ).toThrow(/Invitation routing mismatch/);
  });
});
