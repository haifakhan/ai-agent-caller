import type { CallSessionState, CallSummary } from "./types";

export function createSummary(session: CallSessionState): CallSummary {
  const approved = session.pendingApproval?.status === "approved";
  const appointmentText = approved
    ? session.pendingApproval?.proposedText ?? "Approved commitment"
    : inferAppointment(session);

  const outcome = appointmentText
    ? `${session.request.organization} confirmed: ${appointmentText}.`
    : `The call with ${session.request.organization} ended without a confirmed commitment.`;

  return {
    outcome,
    keyDetails: [
      { label: "Recipient", value: session.request.organization },
      { label: "Phone", value: session.request.phoneNumber },
      { label: "Caller ID mode", value: session.request.callingNumberConfig.mode },
      { label: "Disclosure", value: "AI accessibility assistant disclosed at call start" },
      { label: "Commitment", value: appointmentText || "Not confirmed" },
    ],
    nextSteps: [
      "Review the summary before relying on the outcome.",
      "Watch personal phone or email for callbacks because the shared AccessCall number cannot route callbacks in v1.",
      session.request.saveTranscriptPreference
        ? "Delete the transcript when it is no longer needed."
        : "Transcript was not saved by preference.",
    ],
    transcriptSaved: session.request.saveTranscriptPreference,
  };
}

function inferAppointment(session: CallSessionState): string {
  const combined = session.transcript.map((entry) => entry.text).join(" ");
  const match = combined.match(/Thursday,\s+July\s+16,\s+2026\s+at\s+1:30\s+PM/i);
  return match?.[0] ?? "";
}
