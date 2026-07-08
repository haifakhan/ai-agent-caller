import type { CallPlan, CallRequest, CallRequestInput } from "./types";
import { lineItems } from "./utils";

export function createCallPlan(request: CallRequest | CallRequestInput, requestId: string, planId: string): CallPlan {
  const allowedInfo = lineItems(request.allowedInfo);
  const restrictions = lineItems(request.restrictions);
  const preferredOptions = lineItems(request.preferredOptions);
  const mustConfirm = lineItems(request.mustConfirm);
  const neverAgree = lineItems(request.neverAgree);
  const callerName = request.callerName || "the user";
  const organization = request.organization || "the organization";

  const openingScript = [
    `Hi, I'm an AI accessibility assistant calling with permission from ${callerName}.`,
    "This is a user-controlled accessibility call, and the conversation may be transcribed so they can follow along.",
    `I'm calling ${organization} because they asked me to help with this: ${request.goal}`,
    "I can share only the information they approved, and I will pause to confirm before agreeing to any appointment, fee, cancellation, or sensitive detail.",
  ].join(" ");

  return {
    id: planId,
    requestId,
    goal: request.callType ? `${request.callType}: ${request.goal}` : request.goal,
    openingScript,
    boundaries: [
      "Disclose that this is an AI accessibility assistant at the start of the call.",
      "Stay within appointment and admin-call scope.",
      `Use only approved information: ${allowedInfo.join("; ") || "none provided"}.`,
      `Preferred options: ${preferredOptions.join("; ") || "ask for available options"}.`,
      `Restrictions: ${restrictions.join("; ") || "none provided"}.`,
      `Never agree to: ${neverAgree.join("; ") || "anything material without approval"}.`,
      "If the other party asks for a callback, explain that callbacks to the shared number may not route back to the user.",
    ],
    approvals: [
      "Booking, rescheduling, or cancelling anything.",
      "Agreeing to a payment, fee, deposit, or cancellation charge.",
      "Sharing information outside the approved list.",
      "Accepting an option outside the user's preferred windows.",
      `Ending the call before confirming: ${mustConfirm.join("; ") || "the outcome and next steps"}.`,
    ],
    fallbackResponse: `Let me confirm that with ${callerName} before I agree. If needed, we can follow up after they review the details.`,
    allowedInfo,
    restrictions,
    preferredOptions,
    mustConfirm,
    neverAgree,
  };
}
