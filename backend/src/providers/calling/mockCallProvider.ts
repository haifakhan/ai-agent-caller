import type { ApprovalStatus, CallSessionState, Speaker } from "@accesscall/shared";

interface MockHandlers {
  transcript(sessionId: string, speaker: Speaker, text: string): void;
  currentResponse(sessionId: string, text: string): void;
  approval(sessionId: string, prompt: string, proposedText: string, requiredBecause: string): void;
  status(sessionId: string, status: CallSessionState["status"]): void;
  end(sessionId: string, reason: "completed" | "manual" | "failed"): void;
}

interface MockStep {
  speaker?: Speaker;
  text?: string;
  response?: string;
  approval?: {
    prompt: string;
    proposedText: string;
    requiredBecause: string;
  };
  delay: number;
}

export class MockCallProvider {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly paused = new Set<string>();
  private readonly stepIndex = new Map<string, number>();
  private readonly sessions = new Map<string, CallSessionState>();
  private handlers?: MockHandlers;

  start(session: CallSessionState, handlers: MockHandlers): void {
    this.handlers = handlers;
    this.sessions.set(session.id, session);
    this.stepIndex.set(session.id, 0);
    handlers.status(session.id, "connected");
    handlers.transcript(session.id, "system", `Dialing ${session.request.organization} at ${session.request.phoneNumber}.`);
    this.schedule(session.id, 700);
  }

  pause(sessionId: string): void {
    this.paused.add(sessionId);
    this.clearTimer(sessionId);
  }

  resume(sessionId: string): void {
    this.paused.delete(sessionId);
    this.schedule(sessionId, 800);
  }

  stop(sessionId: string): void {
    this.clearTimer(sessionId);
    this.sessions.delete(sessionId);
    this.stepIndex.delete(sessionId);
    this.paused.delete(sessionId);
  }

  continueAfterApproval(sessionId: string, decision: ApprovalStatus): void {
    if (decision === "approved") {
      this.schedule(sessionId, 1200);
      return;
    }

    this.handlers?.transcript(
      sessionId,
      "other",
      "I understand. I do not have another approved option right now, but the user can follow up later.",
    );
    this.handlers?.end(sessionId, "manual");
  }

  private schedule(sessionId: string, delay: number): void {
    this.clearTimer(sessionId);
    if (this.paused.has(sessionId)) {
      return;
    }

    const timer = setTimeout(() => this.advance(sessionId), delay);
    this.timers.set(sessionId, timer);
  }

  private advance(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const handlers = this.handlers;
    if (!session || !handlers || this.paused.has(sessionId)) {
      return;
    }

    const sequence = this.sequence(session);
    const index = this.stepIndex.get(sessionId) ?? 0;
    const step = sequence[index];
    this.stepIndex.set(sessionId, index + 1);

    if (!step) {
      handlers.end(sessionId, "completed");
      return;
    }

    if (step.speaker && step.text) {
      handlers.transcript(sessionId, step.speaker, step.text);
    }

    if (step.response) {
      handlers.currentResponse(sessionId, step.response);
    }

    if (step.approval) {
      handlers.approval(sessionId, step.approval.prompt, step.approval.proposedText, step.approval.requiredBecause);
      return;
    }

    this.schedule(sessionId, step.delay);
  }

  private clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
    }
    this.timers.delete(sessionId);
  }

  private sequence(session: CallSessionState): MockStep[] {
    const callerName = session.request.callerName;
    const organization = session.request.organization;
    return [
      {
        speaker: "accesscall",
        text: session.plan.openingScript,
        response: "Disclosure spoken. Waiting for the other party.",
        delay: 1800,
      },
      {
        speaker: "other",
        text: `Thanks for calling ${organization}. How can I help?`,
        response: "Stating the approved goal and preferred windows.",
        delay: 1900,
      },
      {
        speaker: "accesscall",
        text: `${callerName} asked me to help with this: ${session.request.goal} Could you check the preferred options first?`,
        response: "Asked for the user's goal using the approved plan.",
        delay: 2200,
      },
      {
        speaker: "other",
        text: "Tuesday afternoon is full. I can offer Thursday, July 16, 2026 at 1:30 PM, or Friday at 9:00 AM.",
        response: "Holding the response because booking requires user approval.",
        approval: {
          prompt:
            "Approve booking Thursday, July 16, 2026 at 1:30 PM? Friday at 9:00 AM conflicts with the stated boundary.",
          proposedText:
            "Thursday, July 16, 2026 at 1:30 PM fits the approved options. Before booking, can you confirm insurance acceptance, address, and anything Sam needs to bring?",
          requiredBecause: "Booking an appointment is a material commitment.",
        },
        delay: 0,
      },
      {
        speaker: "other",
        text: "Yes, we accept GreenShield. The clinic is at 220 King Street. Please bring an insurance card and photo ID.",
        response: "Confirming the details before ending.",
        delay: 1800,
      },
      {
        speaker: "accesscall",
        text:
          "I want to confirm the details back: Thursday, July 16, 2026 at 1:30 PM, 220 King Street, GreenShield accepted, and Sam should bring insurance card and photo ID. Is that correct?",
        response: "Read-back complete. Waiting for confirmation.",
        delay: 1800,
      },
      {
        speaker: "other",
        text: "That is correct. The appointment is booked under Sam Rivera.",
        response: "Preparing closing line.",
        delay: 1500,
      },
      {
        speaker: "accesscall",
        text: "Thank you. I am ending the call now and will share the confirmed summary with Sam.",
        response: "Call complete. Creating summary.",
        delay: 800,
      },
    ];
  }
}
