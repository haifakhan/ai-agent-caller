export interface CallAudioSink {
  speak(text: string): Promise<void>;
  clear?(): Promise<void>;
  end?(): Promise<void>;
}

export class AudioSinkRegistry {
  private readonly sinks = new Map<string, CallAudioSink>();

  register(sessionId: string, sink: CallAudioSink): void {
    this.sinks.set(sessionId, sink);
  }

  unregister(sessionId: string): void {
    this.sinks.delete(sessionId);
  }

  get(sessionId: string): CallAudioSink | undefined {
    return this.sinks.get(sessionId);
  }
}
