import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { env } from "./config/env";
import { HttpError } from "./utils/httpError";
import { createCallRoutes } from "./modules/calls/callRoutes";
import { createTwilioRoutes } from "./modules/twilio/twilioRoutes";
import type { CallService } from "./modules/calls/callService";

export function createApp(callService: CallService): express.Express {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      app: "AccessCall backend",
      providers: {
        call: env.CALL_PROVIDER,
        stt: env.STT_PROVIDER,
        brain: env.BRAIN_PROVIDER,
        tts: env.TTS_PROVIDER,
      },
    });
  });

  app.use("/api", createCallRoutes(callService));
  app.use("/twilio", createTwilioRoutes(callService));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid request body.", details: error.flatten() });
      return;
    }

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({ error: message });
  });

  return app;
}
