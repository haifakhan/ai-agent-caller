import type { CallRequestInput, SafetyResult } from "./types";
import { includesAny } from "./utils";

export const BLOCKED_SCOPE_TERMS = [
  "911",
  "emergency",
  "ambulance",
  "police",
  "bank",
  "credit card",
  "loan",
  "mortgage",
  "immigration",
  "visa",
  "passport",
  "lawyer",
  "attorney",
  "court",
  "lawsuit",
  "diagnosis",
  "diagnose",
  "identity verification",
  "social security",
  "sin number",
  "sales call",
  "cold outreach",
  "pretend to be",
  "impersonate",
];

export const MATERIAL_APPROVAL_TERMS = [
  "book",
  "booking",
  "cancel",
  "cancellation",
  "reschedule",
  "agree",
  "pay",
  "payment",
  "fee",
  "deposit",
  "approve",
  "authorize",
  "share",
  "sensitive",
  "diagnostic",
  "x-ray",
];

export function validateRequestSafety(request: CallRequestInput): SafetyResult {
  const requiredFields: Array<[keyof CallRequestInput, string]> = [
    ["phoneNumber", "phone number"],
    ["organization", "organization"],
    ["goal", "goal"],
    ["callerName", "caller name"],
  ];

  const missing = requiredFields.find(([field]) => !String(request[field] ?? "").trim());
  if (missing) {
    return {
      ok: false,
      reason: `Add a ${missing[1]} before generating a call plan.`,
    };
  }

  const combined = [
    request.organization,
    request.callType,
    request.goal,
    request.allowedInfo,
    request.restrictions,
    request.preferredOptions,
    request.mustConfirm,
    request.neverAgree,
  ].join(" ");

  const matchedTerm = includesAny(combined, BLOCKED_SCOPE_TERMS);
  if (matchedTerm) {
    return {
      ok: false,
      matchedTerm,
      reason: `This request includes "${matchedTerm}", which is outside the v1 safety scope. AccessCall only supports supervised appointment and admin calls.`,
    };
  }

  return { ok: true };
}

export function requiresMaterialApproval(text: string): boolean {
  return MATERIAL_APPROVAL_TERMS.some((term) => {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return pattern.test(text);
  });
}
