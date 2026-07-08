export interface SttProvider {
  connect(callbacks: SttCallbacks): Promise<SttConnection>;
}

export interface SttCallbacks {
  onTranscript(text: string, final: boolean): void;
  onError(error: Error): void;
}

export interface SttConnection {
  sendAudio(audio: Buffer): void;
  close(): void;
}
