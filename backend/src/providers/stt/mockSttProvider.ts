import type { SttCallbacks, SttConnection, SttProvider } from "./sttProvider";

export class MockSttProvider implements SttProvider {
  async connect(callbacks: SttCallbacks): Promise<SttConnection> {
    callbacks.onTranscript("", false);
    return {
      sendAudio: () => undefined,
      close: () => undefined,
    };
  }
}
