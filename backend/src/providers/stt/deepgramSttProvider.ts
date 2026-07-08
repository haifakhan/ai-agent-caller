import WebSocket from "ws";
import { env, requireEnv } from "../../config/env";
import type { SttCallbacks, SttConnection, SttProvider } from "./sttProvider";

export class DeepgramSttProvider implements SttProvider {
  async connect(callbacks: SttCallbacks): Promise<SttConnection> {
    const url = new URL("wss://api.deepgram.com/v1/listen");
    url.searchParams.set("model", env.DEEPGRAM_MODEL);
    url.searchParams.set("encoding", env.DEEPGRAM_ENCODING);
    url.searchParams.set("sample_rate", String(env.DEEPGRAM_SAMPLE_RATE));
    url.searchParams.set("channels", "1");
    url.searchParams.set("interim_results", "true");
    url.searchParams.set("endpointing", "200");
    url.searchParams.set("smart_format", "true");

    const socket = new WebSocket(url, {
      headers: {
        Authorization: `Token ${requireEnv("DEEPGRAM_API_KEY")}`,
      },
    });

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as {
          is_final?: boolean;
          channel?: { alternatives?: Array<{ transcript?: string }> };
        };
        const transcript = message.channel?.alternatives?.[0]?.transcript?.trim();
        if (transcript) {
          callbacks.onTranscript(transcript, Boolean(message.is_final));
        }
      } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error("Invalid Deepgram message"));
      }
    });

    socket.on("error", (error) => callbacks.onError(error));

    return {
      sendAudio(audio: Buffer) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(audio);
        }
      },
      close() {
        socket.close();
      },
    };
  }
}
