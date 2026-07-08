import type { CallSessionState } from "@accesscall/shared";

export interface BrainDecision {
  text: string;
  requiresApproval: boolean;
  approvalPrompt?: string;
  requiredBecause?: string;
}

export interface BrainProvider {
  decide(input: {
    session: CallSessionState;
    latestOtherPartyText: string;
    userInstruction?: string;
  }): Promise<BrainDecision>;
}
