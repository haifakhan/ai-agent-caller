import twilio from "twilio";
import type { CallSessionState } from "@accesscall/shared";
import { env, requireEnv } from "../../config/env";
import type { CallingProvider } from "./callingProvider";

export class TwilioCallingProvider implements CallingProvider {
  private readonly client = twilio(requireEnv("TWILIO_ACCOUNT_SID"), requireEnv("TWILIO_AUTH_TOKEN"));

  async startOutboundCall(session: CallSessionState): Promise<{ externalCallId?: string }> {
    const baseUrl = env.PUBLIC_BASE_URL.replace(/\/$/, "");
    const call = await this.client.calls.create({
      to: session.request.phoneNumber,
      from: requireEnv("TWILIO_FROM_NUMBER"),
      url: `${baseUrl}/twilio/voice?sessionId=${encodeURIComponent(session.id)}`,
      method: "POST",
      statusCallback: env.TWILIO_STATUS_CALLBACK_URL || `${baseUrl}/twilio/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    return { externalCallId: call.sid };
  }

  async endCall(session: CallSessionState): Promise<void> {
    const callSid = session.transcript.find((entry) => entry.text.startsWith("Twilio call SID:"))?.text.split(": ")[1];
    if (callSid) {
      await this.client.calls(callSid).update({ status: "completed" });
    }
  }
}
