import { TextProcessingOptions } from './types';

export class TextProcessor {
    private options: Required<TextProcessingOptions>;

    constructor(options?: TextProcessingOptions) {
        this.options = {
            maxChunkSize: 2000,
            removeSpecialChars: true,
            preserveNewlines: true,
            ...options
        };
    }

    public cleanText(text: string): string {
        let cleaned = text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, this.options.preserveNewlines ? '\n' : ' ');

        if (this.options.removeSpecialChars) {
            cleaned = cleaned.replace(/[^\w\s\n.,?!-]/g, '');
        }

        return cleaned.trim();
    }

    public splitIntoChunks(text: string): string[] {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > this.options.maxChunkSize) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += sentence + ' ';
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    public formatText(text: string): string {
        const cleaned = this.cleanText(text);
        return cleaned
            .replace(/([.!?])\s+/g, '$1\n')  // Add newline after sentences
            .replace(/\n{3,}/g, '\n\n')      // Limit consecutive newlines
            .trim();
    }
}