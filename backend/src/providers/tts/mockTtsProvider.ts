import type { TtsProvider } from "./ttsProvider";

export class MockTtsProvider implements TtsProvider {
  async synthesizeMuLaw(): Promise<Buffer[]> {
    return [];
  }
}
