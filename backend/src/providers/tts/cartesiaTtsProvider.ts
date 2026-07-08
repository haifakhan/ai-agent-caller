import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { env, requireEnv } from "../../config/env";
import { pcm16leToMuLaw } from "./mulaw";
import type { TtsProvider } from "./ttsProvider";

export class CartesiaTtsProvider implements TtsProvider {
  async synthesizeMuLaw(text: string): Promise<Buffer[]> {
    const url = new URL("wss://api.cartesia.ai/tts/websocket");
    url.searchParams.set("cartesia_version", env.CARTESIA_VERSION);
    const socket = new WebSocket(url, {
      headers: {
        "X-API-Key": requireEnv("CARTESIA_API_KEY"),
      },
    });

    const chunks: Buffer[] = [];
    const contextId = randomUUID();

    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => {
        socket.send(
          JSON.stringify({
            model_id: env.CARTESIA_MODEL_ID,
            transcript: text,
            voice: {
              mode: "id",
              id: env.CARTESIA_VOICE_ID,
            },
            language: "en",
            context_id: contextId,
            output_format: {
              container: "raw",
              encoding: "pcm_s16le",
              sample_rate: 8000,
            },
            add_timestamps: false,
            continue: false,
          }),
        );
      });

      socket.on("message", (data) => {
        const message = JSON.parse(data.toString()) as {
          type?: string;
          data?: string;
          done?: boolean;
          message?: string;
        };

        if (message.type === "chunk" && message.data) {
          chunks.push(pcm16leToMuLaw(Buffer.from(message.data, "base64")));
        }

        if (message.type === "error") {
          reject(new Error(message.message || "Cartesia TTS error"));
        }

        if (message.done) {
          resolve();
          socket.close();
        }
      });

      socket.once("error", reject);
      socket.once("close", () => resolve());
    });

    return chunks;
  }
}
