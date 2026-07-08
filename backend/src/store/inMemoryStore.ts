import type { CallPlan, CallRequest, CallSessionState, TranscriptEntry } from "@accesscall/shared";

export class InMemoryStore {
  private readonly requests = new Map<string, CallRequest>();
  private readonly plans = new Map<string, CallPlan>();
  private readonly plansByRequest = new Map<string, CallPlan>();
  private readonly sessions = new Map<string, CallSessionState>();

  saveRequest(request: CallRequest): void {
    this.requests.set(request.id, request);
  }

  savePlan(plan: CallPlan): void {
    this.plans.set(plan.id, plan);
    this.plansByRequest.set(plan.requestId, plan);
  }

  getRequest(id: string): CallRequest | undefined {
    return this.requests.get(id);
  }

  getPlanForRequest(requestId: string): CallPlan | undefined {
    return this.plansByRequest.get(requestId);
  }

  saveSession(session: CallSessionState): void {
    this.sessions.set(session.id, session);
  }

  getSession(id: string): CallSessionState | undefined {
    return this.sessions.get(id);
  }

  appendTranscript(sessionId: string, entry: TranscriptEntry): CallSessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.transcript = [...session.transcript, entry];
    this.sessions.set(sessionId, session);
    return session;
  }

  clearTranscript(sessionId: string): CallSessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.transcript = [];
    if (session.summary) {
      session.summary = {
        ...session.summary,
        transcriptSaved: false,
      };
    }
    this.sessions.set(sessionId, session);
    return session;
  }
}
