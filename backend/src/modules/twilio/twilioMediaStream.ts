import type { IncomingMessage } from "node:http";
import WebSocket, { WebSocketServer } from "ws";
import type { CallService } from "../calls/callService";
import type { SttProvider, SttConnection } from "../../providers/stt/sttProvider";
import type { TtsProvider } from "../../providers/tts/ttsProvider";
import type { AudioSinkRegistry, CallAudioSink } from "../../providers/audio/audioSinkRegistry";

interface TwilioStartMessage {
  event: "start";
  streamSid: string;
  start: {
    streamSid: string;
    callSid: string;
    customParameters?: Record<string, string>;
  };
}

interface TwilioMediaMessage {
  event: "media";
  streamSid: string;
  media: {
    payload: string;
  };
}

type TwilioMessage =
  | { event: "connected" }
  | TwilioStartMessage
  | TwilioMediaMessage
  | { event: "stop"; streamSid: string }
  | { event: "dtmf"; dtmf?: { digit?: string } }
  | { event: "mark"; mark?: { name?: string } };

export class TwilioMediaStreamServer {
  readonly server = new WebSocketServer({ noServer: true });

  constructor(
    private readonly callService: CallService,
    private readonly stt: SttProvider,
    private readonly tts: TtsProvider,
    private readonly audioSinks: AudioSinkRegistry,
  ) {
    this.server.on("connection", (socket, request) => {
      void this.handleConnection(socket, request);
    });
  }

  private async handleConnection(socket: WebSocket, _request: IncomingMessage): Promise<void> {
    let sessionId = "";
    let streamSid = "";
    let sttConnection: SttConnection | undefined;

    socket.on("message", async (raw) => {
      const message = JSON.parse(raw.toString()) as TwilioMessage;

      if (message.event === "start") {
        sessionId = message.start.customParameters?.sessionId || "";
        streamSid = message.start.streamSid || message.streamSid;
        this.callService.appendTranscript(sessionId, "system", `Twilio media stream connected for call ${message.start.callSid}.`);
        this.callService.updateStatus(sessionId, "connected");

        const sink = new TwilioAudioSink(socket, streamSid, this.tts);
        this.audioSinks.register(sessionId, sink);
        await sink.speak(this.callService.getSession(sessionId).plan.openingScript);

        sttConnection = await this.stt.connect({
          onTranscript: (text, final) => void this.callService.handleOtherPartyTranscript(sessionId, text, final),
          onError: (error) => {
            this.callService.appendTranscript(sessionId, "system", `STT error: ${error.message}`);
          },
        });
      }

      if (message.event === "media" && sttConnection) {
        sttConnection.sendAudio(Buffer.from(message.media.payload, "base64"));
      }

      if (message.event === "dtmf" && sessionId) {
        this.callService.appendTranscript(sessionId, "system", `DTMF received: ${message.dtmf?.digit || "unknown"}`);
      }

      if (message.event === "stop" && sessionId) {
        sttConnection?.close();
        this.audioSinks.unregister(sessionId);
        await this.callService.endSession(sessionId, "completed");
      }
    });

    socket.on("close", () => {
      sttConnection?.close();
      if (sessionId) {
        this.audioSinks.unregister(sessionId);
      }
    });
  }
}

class TwilioAudioSink implements CallAudioSink {
  constructor(
    private readonly socket: WebSocket,
    private readonly streamSid: string,
    private readonly tts: TtsProvider,
  ) {}

  async speak(text: string): Promise<void> {
    const chunks = await this.tts.synthesizeMuLaw(text);
    for (const chunk of chunks) {
      this.send({
        event: "media",
        streamSid: this.streamSid,
        media: {
          payload: chunk.toString("base64"),
        },
      });
    }
    this.send({
      event: "mark",
      streamSid: this.streamSid,
      mark: { name: `spoken-${Date.now()}` },
    });
  }

  async clear(): Promise<void> {
    this.send({
      event: "clear",
      streamSid: this.streamSid,
    });
  }

  async end(): Promise<void> {
    this.socket.close();
  }

  private send(payload: object): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
