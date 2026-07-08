import { requiresMaterialApproval } from "@accesscall/shared";
import type { BrainDecision, BrainProvider } from "./brainProvider";

export class MockBrainProvider implements BrainProvider {
  async decide(input: { latestOtherPartyText: string; userInstruction?: string }): Promise<BrainDecision> {
    const source = input.userInstruction || input.latestOtherPartyText;
    if (requiresMaterialApproval(source)) {
      return {
        text: "Let me confirm that with the user before I agree.",
        requiresApproval: true,
        approvalPrompt: "This response may commit the user to something material. Approve before speaking?",
        requiredBecause: "Material commitments require explicit user approval.",
      };
    }

    return {
      text: input.userInstruction
        ? `I will ask that now: ${input.userInstruction}`
        : "Could you clarify that in one sentence so the user can decide?",
      requiresApproval: false,
    };
  }
}
