import OpenAI from "openai";
import type { CallSessionState } from "@accesscall/shared";
import { env, requireEnv } from "../../config/env";
import type { BrainDecision, BrainProvider } from "./brainProvider";

export class OpenAiBrainProvider implements BrainProvider {
  private readonly client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });

  async decide(input: {
    session: CallSessionState;
    latestOtherPartyText: string;
    userInstruction?: string;
  }): Promise<BrainDecision> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are AccessCall, a disclosed AI accessibility assistant. Never impersonate a human. Stay within the call plan. Return strict JSON with text, requiresApproval, approvalPrompt, and requiredBecause.",
        },
        {
          role: "user",
          content: JSON.stringify({
            plan: input.session.plan,
            transcript: input.session.transcript.slice(-12),
            latestOtherPartyText: input.latestOtherPartyText,
            userInstruction: input.userInstruction,
            rule:
              "If the response books, cancels, reschedules, agrees to a fee/payment, shares sensitive info, or accepts an option outside boundaries, set requiresApproval true and do not finalize the commitment.",
          }),
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message.content ?? "{}";
    const parsed = JSON.parse(content) as Partial<BrainDecision>;

    return {
      text: parsed.text || input.session.plan.fallbackResponse,
      requiresApproval: Boolean(parsed.requiresApproval),
      approvalPrompt: parsed.approvalPrompt,
      requiredBecause: parsed.requiredBecause,
    };
  }
}
