declare module "bidi-js" {
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }

  export interface Bidi {
    getEmbeddingLevels(
      text: string,
      baseDirection?: "ltr" | "rtl" | "auto"
    ): EmbeddingLevels;
    getReorderedString(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number
    ): string;
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number
    ): [number, number][];
  }

  export default function bidiFactory(): Bidi;
}
