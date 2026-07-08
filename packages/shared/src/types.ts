export type CallingNumberMode = "shared" | "own_verified" | "platform_provided";

export type CallType =
  | "Book an appointment"
  | "Reschedule an appointment"
  | "Cancel an appointment"
  | "Ask about pricing"
  | "Ask about hours or documents"
  | "Confirm next steps";

export type Speaker = "user" | "accesscall" | "other" | "system";

export type CallStatus =
  | "draft"
  | "planned"
  | "dialing"
  | "connected"
  | "needs_approval"
  | "paused"
  | "ended"
  | "failed";

export type ApprovalStatus = "pending" | "approved" | "declined" | "alternative";

export type LiveControl =
  | "repeat"
  | "clarify"
  | "price"
  | "email"
  | "dontAgree"
  | "pause"
  | "resume"
  | "end";

export interface CallingNumberConfig {
  mode: CallingNumberMode;
  verifiedNumber?: string;
  platformNumberSid?: string;
}

export interface CallRequestInput {
  callerName: string;
  phoneNumber: string;
  organization: string;
  callType: CallType | "";
  goal: string;
  allowedInfo: string;
  restrictions: string;
  preferredOptions: string;
  mustConfirm: string;
  neverAgree: string;
  saveTranscriptPreference: boolean;
  callingNumberConfig: CallingNumberConfig;
}

export interface CallRequest extends CallRequestInput {
  id: string;
  userId: string;
  createdAt: string;
  status: "planned" | "started" | "completed" | "failed";
}

export interface CallPlan {
  id: string;
  requestId: string;
  goal: string;
  openingScript: string;
  boundaries: string[];
  approvals: string[];
  fallbackResponse: string;
  allowedInfo: string[];
  restrictions: string[];
  preferredOptions: string[];
  mustConfirm: string[];
  neverAgree: string[];
}

export interface TranscriptEntry {
  id: string;
  sessionId: string;
  speaker: Speaker;
  text: string;
  timestamp: string;
  final: boolean;
}

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  status: ApprovalStatus;
  prompt: string;
  proposedText: string;
  requiredBecause: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CallSummary {
  outcome: string;
  keyDetails: Array<{ label: string; value: string }>;
  nextSteps: string[];
  transcriptSaved: boolean;
}

export interface CallSessionState {
  id: string;
  request: CallRequest;
  plan: CallPlan;
  status: CallStatus;
  providerMode: "mock" | "twilio";
  startedAt?: string;
  endedAt?: string;
  currentResponse: string;
  transcript: TranscriptEntry[];
  pendingApproval?: ApprovalRequest;
  summary?: CallSummary;
  error?: string;
}

export interface SafetyResult {
  ok: boolean;
  reason?: string;
  matchedTerm?: string;
}

export type ClientEvent =
  | { type: "session.state"; session: CallSessionState }
  | { type: "transcript.entry"; entry: TranscriptEntry }
  | { type: "approval.requested"; approval: ApprovalRequest }
  | { type: "approval.resolved"; approval: ApprovalRequest }
  | { type: "summary.created"; summary: CallSummary }
  | { type: "error"; message: string };

export interface ControlCommand {
  control: LiveControl;
  text?: string;
}
