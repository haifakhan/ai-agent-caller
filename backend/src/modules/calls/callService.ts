import {
  createCallPlan,
  createSummary,
  nowIso,
  requiresMaterialApproval,
  validateRequestSafety,
  type ApprovalRequest,
  type ApprovalStatus,
  type CallRequest,
  type CallRequestInput,
  type CallSessionState,
  type ControlCommand,
  type LiveControl,
  type Speaker,
  type TranscriptEntry,
} from "@accesscall/shared";
import type { AudioSinkRegistry } from "../../providers/audio/audioSinkRegistry";
import type { CallingProvider } from "../../providers/calling/callingProvider";
import { MockCallProvider } from "../../providers/calling/mockCallProvider";
import type { BrainProvider } from "../../providers/brain/brainProvider";
import { env } from "../../config/env";
import { HttpError } from "../../utils/httpError";
import { id } from "../../utils/ids";
import type { ClientHub } from "../../realtime/clientHub";
import type { InMemoryStore } from "../../store/inMemoryStore";

export class CallService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly hub: ClientHub,
    private readonly mockCalls: MockCallProvider,
    private readonly callingProvider: CallingProvider,
    private readonly brain: BrainProvider,
    private readonly audioSinks: AudioSinkRegistry,
  ) {}

  createPlan(input: CallRequestInput): { request: CallRequest; plan: CallSessionState["plan"] } {
    const safety = validateRequestSafety(input);
    if (!safety.ok) {
      throw new HttpError(400, safety.reason ?? "Call request is outside the supported scope.");
    }

    const request: CallRequest = {
      ...input,
      id: id("req"),
      userId: "demo-user",
      createdAt: nowIso(),
      status: "planned",
    };
    const plan = createCallPlan(request, request.id, id("plan"));

    this.store.saveRequest(request);
    this.store.savePlan(plan);

    return { request, plan };
  }

  async startSession(requestId: string, scriptApproved: boolean): Promise<CallSessionState> {
    if (!scriptApproved) {
      throw new HttpError(400, "The user must approve the opening disclosure script before calling.");
    }

    const request = this.store.getRequest(requestId);
    const plan = this.store.getPlanForRequest(requestId);
    if (!request || !plan) {
      throw new HttpError(404, "Call request not found.");
    }

    const session: CallSessionState = {
      id: id("session"),
      request: { ...request, status: "started" },
      plan,
      status: "dialing",
      providerMode: env.CALL_PROVIDER,
      startedAt: nowIso(),
      currentResponse: "Dialing.",
      transcript: [],
    };

    this.store.saveSession(session);
    this.hub.broadcastState(session);

    if (env.CALL_PROVIDER === "twilio") {
      const result = await this.callingProvider.startOutboundCall(session);
      if (result.externalCallId) {
        this.appendTranscript(session.id, "system", `Twilio call SID: ${result.externalCallId}`);
      }
    } else {
      this.mockCalls.start(session, {
        transcript: (sessionId, speaker, text) => this.appendTranscript(sessionId, speaker, text),
        currentResponse: (sessionId, text) => this.updateCurrentResponse(sessionId, text),
        approval: (sessionId, prompt, proposedText, requiredBecause) =>
          this.requestApproval(sessionId, prompt, proposedText, requiredBecause),
        status: (sessionId, status) => this.updateStatus(sessionId, status),
        end: (sessionId, reason) => void this.endSession(sessionId, reason),
      });
    }

    return this.getSession(session.id);
  }

  getSession(sessionId: string): CallSessionState {
    const session = this.store.getSession(sessionId);
    if (!session) {
      throw new HttpError(404, "Call session not found.");
    }
    return session;
  }

  async handleControl(sessionId: string, command: ControlCommand): Promise<CallSessionState> {
    const session = this.getSession(sessionId);

    if (session.status === "ended" || session.status === "failed") {
      throw new HttpError(409, "This call has already ended.");
    }

    if (command.text?.trim()) {
      return this.handleTypedInstruction(sessionId, command.text.trim());
    }

    switch (command.control) {
      case "pause":
        this.mockCalls.pause(sessionId);
        return this.applyControlResponse(sessionId, "pause", "Paused the assistant.", "Let me pause while I confirm with the user.");
      case "resume":
        this.mockCalls.resume(sessionId);
        return this.applyControlResponse(sessionId, "resume", "Resumed the assistant.", "I am ready to continue.");
      case "end":
        await this.endSession(sessionId, "manual");
        return this.getSession(sessionId);
      default:
        return this.applyQuickControl(sessionId, command.control);
    }
  }

  async handleOtherPartyTranscript(sessionId: string, text: string, final: boolean): Promise<void> {
    if (!text.trim()) {
      return;
    }

    const session = this.appendTranscript(sessionId, "other", text.trim(), final);
    if (!final || session.pendingApproval) {
      return;
    }

    const decision = await this.brain.decide({
      session,
      latestOtherPartyText: text,
    });

    if (decision.requiresApproval) {
      this.requestApproval(
        sessionId,
        decision.approvalPrompt || "Approve this response before AccessCall speaks?",
        decision.text,
        decision.requiredBecause || "The response may make a material commitment.",
      );
      return;
    }

    await this.speak(sessionId, decision.text);
  }

  async resolveApproval(sessionId: string, approvalId: string, decision: ApprovalStatus): Promise<CallSessionState> {
    const session = this.getSession(sessionId);
    if (!session.pendingApproval || session.pendingApproval.id !== approvalId) {
      throw new HttpError(404, "Pending approval not found.");
    }

    const resolved: ApprovalRequest = {
      ...session.pendingApproval,
      status: decision,
      resolvedAt: nowIso(),
    };

    session.pendingApproval = resolved;
    session.status = "connected";
    this.store.saveSession(session);
    this.hub.broadcast(sessionId, { type: "approval.resolved", approval: resolved });

    if (decision === "approved") {
      this.appendTranscript(sessionId, "user", "Approved the pending response.");
      await this.speak(sessionId, resolved.proposedText);
    } else if (decision === "declined") {
      this.appendTranscript(sessionId, "user", "Declined the pending response.");
      await this.speak(sessionId, session.plan.fallbackResponse);
    } else if (decision === "alternative") {
      this.appendTranscript(sessionId, "user", "Asked for an alternative option.");
      await this.speak(sessionId, "Could you check for another approved option before we decide?");
    }

    this.mockCalls.continueAfterApproval(sessionId, decision);
    return this.getSession(sessionId);
  }

  async endSession(sessionId: string, reason: "completed" | "manual" | "failed"): Promise<CallSessionState> {
    const session = this.getSession(sessionId);
    if (session.status === "ended") {
      return session;
    }

    this.mockCalls.stop(sessionId);
    await this.audioSinks.get(sessionId)?.end?.();
    this.audioSinks.unregister(sessionId);

    session.status = reason === "failed" ? "failed" : "ended";
    session.endedAt = nowIso();
    session.currentResponse = reason === "completed" ? "Call complete. Summary created." : "Call ended. Summary created.";
    session.request.status = reason === "failed" ? "failed" : "completed";
    session.summary = createSummary(session);
    this.store.saveSession(session);

    this.appendTranscript(sessionId, "system", reason === "completed" ? "Call ended. Summary created." : "Call ended early. Summary created.");
    this.hub.broadcast(sessionId, { type: "summary.created", summary: session.summary });
    return this.getSession(sessionId);
  }

  deleteTranscript(sessionId: string): CallSessionState {
    const session = this.store.clearTranscript(sessionId);
    if (!session) {
      throw new HttpError(404, "Call session not found.");
    }
    this.hub.broadcastState(session);
    return session;
  }

  transcriptText(sessionId: string): string {
    const session = this.getSession(sessionId);
    return session.transcript
      .map((entry) => `[${entry.timestamp}] ${entry.speaker.toUpperCase()}: ${entry.text}`)
      .join("\n");
  }

  updateStatus(sessionId: string, status: CallSessionState["status"]): CallSessionState {
    const session = this.getSession(sessionId);
    session.status = status;
    this.store.saveSession(session);
    this.hub.broadcastState(session);
    return session;
  }

  updateCurrentResponse(sessionId: string, text: string): CallSessionState {
    const session = this.getSession(sessionId);
    session.currentResponse = text;
    this.store.saveSession(session);
    this.hub.broadcastState(session);
    return session;
  }

  appendTranscript(sessionId: string, speaker: Speaker, text: string, final = true): CallSessionState {
    const entry: TranscriptEntry = {
      id: id("trn"),
      sessionId,
      speaker,
      text,
      timestamp: nowIso(),
      final,
    };

    const session = this.store.appendTranscript(sessionId, entry);
    if (!session) {
      throw new HttpError(404, "Call session not found.");
    }

    this.hub.broadcast(sessionId, { type: "transcript.entry", entry });
    this.hub.broadcastState(session);
    return session;
  }

  requestApproval(sessionId: string, prompt: string, proposedText: string, requiredBecause: string): ApprovalRequest {
    const session = this.getSession(sessionId);
    const approval: ApprovalRequest = {
      id: id("approval"),
      sessionId,
      status: "pending",
      prompt,
      proposedText,
      requiredBecause,
      createdAt: nowIso(),
    };

    session.pendingApproval = approval;
    session.status = "needs_approval";
    session.currentResponse = "Waiting for user approval before speaking.";
    this.store.saveSession(session);
    this.hub.broadcast(sessionId, { type: "approval.requested", approval });
    this.hub.broadcastState(session);
    return approval;
  }

  private async handleTypedInstruction(sessionId: string, text: string): Promise<CallSessionState> {
    const session = this.getSession(sessionId);
    this.appendTranscript(sessionId, "user", `Instruction: ${text}`);

    if (session.pendingApproval) {
      this.appendTranscript(
        sessionId,
        "system",
        "Instruction noted. The pending commitment still requires the approval gate before AccessCall can agree.",
      );
      return this.updateCurrentResponse(sessionId, "Instruction held while approval is pending.");
    }

    if (requiresMaterialApproval(text)) {
      this.requestApproval(
        sessionId,
        "This instruction may create a material commitment. Approve the assistant's response before it is spoken?",
        `I can ask about that, but I will confirm with ${session.request.callerName} before agreeing to any booking, fee, cancellation, or sensitive detail.`,
        "Typed instruction mentions a material action.",
      );
      return this.getSession(sessionId);
    }

    const decision = await this.brain.decide({
      session,
      latestOtherPartyText: "",
      userInstruction: text,
    });

    if (decision.requiresApproval) {
      this.requestApproval(
        sessionId,
        decision.approvalPrompt || "Approve this response before AccessCall speaks?",
        decision.text,
        decision.requiredBecause || "The response may make a material commitment.",
      );
      return this.getSession(sessionId);
    }

    await this.speak(sessionId, decision.text);
    return this.getSession(sessionId);
  }

  private applyQuickControl(sessionId: string, control: Exclude<LiveControl, "pause" | "resume" | "end">): CallSessionState {
    const session = this.getSession(sessionId);
    const lastOther = [...session.transcript].reverse().find((entry) => entry.speaker === "other")?.text;
    const responses: Record<typeof control, { user: string; ai: string }> = {
      repeat: {
        user: "Asked AccessCall to repeat the last point.",
        ai: lastOther ? `I will repeat the last point for the user: ${lastOther}` : "Could you repeat the last point?",
      },
      clarify: {
        user: "Asked AccessCall to clarify.",
        ai: "Could you clarify that in one sentence so the user can decide?",
      },
      price: {
        user: "Asked AccessCall to confirm price.",
        ai: "Can you confirm the price, any fees, and whether insurance is accepted before we decide?",
      },
      email: {
        user: "Asked AccessCall to request written confirmation.",
        ai: "Can you send written confirmation by email or text if that is available?",
      },
      dontAgree: {
        user: "Told AccessCall not to agree.",
        ai: session.plan.fallbackResponse,
      },
    };

    const response = responses[control];
    this.appendTranscript(sessionId, "user", response.user);
    void this.speak(sessionId, response.ai);
    return this.updateCurrentResponse(sessionId, "User control applied.");
  }

  private applyControlResponse(sessionId: string, status: "pause" | "resume", userText: string, aiText: string): CallSessionState {
    this.appendTranscript(sessionId, "user", userText);
    this.appendTranscript(sessionId, "accesscall", aiText);
    return this.updateStatus(sessionId, status === "pause" ? "paused" : "connected");
  }

  private async speak(sessionId: string, text: string): Promise<void> {
    this.appendTranscript(sessionId, "accesscall", text);
    this.updateCurrentResponse(sessionId, "Response spoken.");
    await this.audioSinks.get(sessionId)?.speak(text);
  }
}
