import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: "../.env" });

const envSchema = z.object({
  APP_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("127.0.0.1"),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  MOCK_MODE: z.coerce.boolean().default(true),
  CALL_PROVIDER: z.enum(["mock", "twilio"]).default("mock"),
  STT_PROVIDER: z.enum(["mock", "deepgram"]).default("mock"),
  BRAIN_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  TTS_PROVIDER: z.enum(["mock", "cartesia"]).default("mock"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_STATUS_CALLBACK_URL: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  DEEPGRAM_MODEL: z.string().default("nova-3"),
  DEEPGRAM_ENCODING: z.string().default("mulaw"),
  DEEPGRAM_SAMPLE_RATE: z.coerce.number().default(8000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  CARTESIA_API_KEY: z.string().optional(),
  CARTESIA_MODEL_ID: z.string().default("sonic-latest"),
  CARTESIA_VOICE_ID: z.string().default("a0e99841-438c-4a64-b679-ae501e7d6091"),
  CARTESIA_VERSION: z.string().default("2026-03-01"),
  TRANSCRIPT_RETENTION_DAYS: z.coerce.number().default(30),
  ALLOWED_OUTBOUND_COUNTRY_CODES: z.string().default("+1"),
});

export const env = envSchema.parse(process.env);

export function requireEnv(name: keyof typeof env): string {
  const value = env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
