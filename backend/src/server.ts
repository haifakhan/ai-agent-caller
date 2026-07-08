import http from "node:http";
import { WebSocketServer } from "ws";
import { URL } from "node:url";
import { env } from "./config/env";
import { createApp } from "./app";
import { InMemoryStore } from "./store/inMemoryStore";
import { ClientHub } from "./realtime/clientHub";
import { AudioSinkRegistry } from "./providers/audio/audioSinkRegistry";
import { MockCallProvider } from "./providers/calling/mockCallProvider";
import { TwilioCallingProvider } from "./providers/calling/twilioCallingProvider";
import type { CallingProvider } from "./providers/calling/callingProvider";
import { MockBrainProvider } from "./providers/brain/mockBrainProvider";
import { OpenAiBrainProvider } from "./providers/brain/openAiBrainProvider";
import { MockSttProvider } from "./providers/stt/mockSttProvider";
import { DeepgramSttProvider } from "./providers/stt/deepgramSttProvider";
import { MockTtsProvider } from "./providers/tts/mockTtsProvider";
import { CartesiaTtsProvider } from "./providers/tts/cartesiaTtsProvider";
import { CallService } from "./modules/calls/callService";
import { TwilioMediaStreamServer } from "./modules/twilio/twilioMediaStream";

const store = new InMemoryStore();
const hub = new ClientHub();
const audioSinks = new AudioSinkRegistry();
const mockCalls = new MockCallProvider();

const callingProvider: CallingProvider =
  env.CALL_PROVIDER === "twilio"
    ? new TwilioCallingProvider()
    : {
        async startOutboundCall() {
          return {};
        },
      };

const brain = env.BRAIN_PROVIDER === "openai" ? new OpenAiBrainProvider() : new MockBrainProvider();
const stt = env.STT_PROVIDER === "deepgram" ? new DeepgramSttProvider() : new MockSttProvider();
const tts = env.TTS_PROVIDER === "cartesia" ? new CartesiaTtsProvider() : new MockTtsProvider();

const callService = new CallService(store, hub, mockCalls, callingProvider, brain, audioSinks);
const app = createApp(callService);
const server = http.createServer(app);

const clientWss = new WebSocketServer({ noServer: true });
const twilioWss = new TwilioMediaStreamServer(callService, stt, tts, audioSinks);

clientWss.on("connection", (socket, request) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    socket.close(1008, "Missing sessionId");
    return;
  }

  hub.subscribe(sessionId, socket);
  try {
    socket.send(JSON.stringify({ type: "session.state", session: callService.getSession(sessionId) }));
  } catch {
    socket.close(1008, "Session not found");
  }
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);

  if (url.pathname === "/ws/client") {
    clientWss.handleUpgrade(request, socket, head, (ws) => {
      clientWss.emit("connection", ws, request);
    });
    return;
  }

  if (url.pathname === "/ws/twilio-media") {
    twilioWss.server.handleUpgrade(request, socket, head, (ws) => {
      twilioWss.server.emit("connection", ws, request);
    });
    return;
  }

  socket.destroy();
});

server.listen(env.PORT, env.HOST, () => {
  console.log(`AccessCall backend listening on http://${env.HOST}:${env.PORT}`);
});
