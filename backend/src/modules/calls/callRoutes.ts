import { Router } from "express";
import { z } from "zod";
import type { CallRequestInput, ControlCommand } from "@accesscall/shared";
import type { CallService } from "./callService";

const callTypeSchema = z.enum([
  "Book an appointment",
  "Reschedule an appointment",
  "Cancel an appointment",
  "Ask about pricing",
  "Ask about hours or documents",
  "Confirm next steps",
]);

const requestSchema = z.object({
  callerName: z.string().min(1),
  phoneNumber: z.string().min(3),
  organization: z.string().min(1),
  callType: z.union([callTypeSchema, z.literal("")]).default(""),
  goal: z.string().min(1),
  allowedInfo: z.string().default(""),
  restrictions: z.string().default(""),
  preferredOptions: z.string().default(""),
  mustConfirm: z.string().default(""),
  neverAgree: z.string().default(""),
  saveTranscriptPreference: z.boolean().default(true),
  callingNumberConfig: z
    .object({
      mode: z.enum(["shared", "own_verified", "platform_provided"]).default("shared"),
      verifiedNumber: z.string().optional(),
      platformNumberSid: z.string().optional(),
    })
    .default({ mode: "shared" }),
});

const controlSchema = z.object({
  control: z.enum(["repeat", "clarify", "price", "email", "dontAgree", "pause", "resume", "end"]),
  text: z.string().optional(),
});

export function createCallRoutes(callService: CallService): Router {
  const router = Router();

  router.post("/call-requests/plan", (req, res) => {
    const parsed = requestSchema.parse(req.body) as CallRequestInput;
    res.json(callService.createPlan(parsed));
  });

  router.post("/call-sessions", async (req, res) => {
    const body = z.object({ requestId: z.string(), scriptApproved: z.boolean() }).parse(req.body);
    res.json(await callService.startSession(body.requestId, body.scriptApproved));
  });

  router.get("/call-sessions/:sessionId", (req, res) => {
    res.json(callService.getSession(req.params.sessionId));
  });

  router.post("/call-sessions/:sessionId/control", async (req, res) => {
    const command = controlSchema.parse(req.body) as ControlCommand;
    res.json(await callService.handleControl(req.params.sessionId, command));
  });

  router.post("/call-sessions/:sessionId/approvals/:approvalId", async (req, res) => {
    const body = z.object({ decision: z.enum(["approved", "declined", "alternative"]) }).parse(req.body);
    res.json(await callService.resolveApproval(req.params.sessionId, req.params.approvalId, body.decision));
  });

  router.delete("/call-sessions/:sessionId/transcript", (req, res) => {
    res.json(callService.deleteTranscript(req.params.sessionId));
  });

  router.get("/call-sessions/:sessionId/transcript.txt", (req, res) => {
    res.type("text/plain").send(callService.transcriptText(req.params.sessionId));
  });

  return router;
}
