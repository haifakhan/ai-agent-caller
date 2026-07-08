export interface TtsProvider {
  synthesizeMuLaw(text: string): Promise<Buffer[]>;
}
