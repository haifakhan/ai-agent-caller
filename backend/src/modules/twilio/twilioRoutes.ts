import { Router } from "express";
import twilio from "twilio";
import { env } from "../../config/env";
import type { CallService } from "../calls/callService";

export function createTwilioRoutes(callService: CallService): Router {
  const router = Router();

  router.post("/voice", (req, res) => {
    const sessionId = String(req.query.sessionId || "");
    const response = new twilio.twiml.VoiceResponse();
    const connect = response.connect();
    const stream = connect.stream({
      url: `${env.PUBLIC_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "")}/ws/twilio-media`,
    });
    stream.parameter({ name: "sessionId", value: sessionId });

    res.type("text/xml").send(response.toString());
  });

  router.post("/status", (req, res) => {
    const sessionId = String(req.body?.sessionId || req.query.sessionId || "");
    const status = String(req.body?.CallStatus || "");
    if (sessionId && status === "completed") {
      void callService.endSession(sessionId, "completed").catch(() => undefined);
    }
    res.sendStatus(204);
  });

  return router;
}
