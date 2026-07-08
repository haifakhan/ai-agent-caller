import type { CallSessionState } from "@accesscall/shared";

export interface CallingProvider {
  startOutboundCall(session: CallSessionState): Promise<{ externalCallId?: string }>;
  endCall?(session: CallSessionState): Promise<void>;
}
