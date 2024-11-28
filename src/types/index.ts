export interface ScraperOptions {
    headless?: boolean | 'new' | undefined;
    timeout?: number;
    userAgent?: string;
    maxDepth?: number;
    checkSublinks?: boolean;
    saveToFile?: boolean;
    outputDir?: string;
}

export interface DocumentSection {
    heading: string;
    content: string;
    level: number;  // Added to track heading hierarchy
    subsections: DocumentSection[];  // Added for nested structure
}

export interface CodeBlock {
    language: string;
    code: string;
    context?: string;  // Added for code block context
    filename?: string; // Added for file references
}

export interface ScrapedDocument {
    url: string;
    title: string;
    summary: string;
    fullText: string;  // Added to store complete page content
    sections: DocumentSection[];
    codeBlocks: CodeBlock[];
    metadata: {
        description?: string;
        lastUpdated: Date;
        keywords?: string[];  // Added for meta keywords
        author?: string;      // Added for meta author
    };
    sublinks?: LinkStatus[];
}

export interface LinkStatus {
    url: string;
    status: number;
    active: boolean;
    error?: string;
}

export interface TextProcessingOptions {
    maxChunkSize?: number;
    removeSpecialChars?: boolean;
    preserveNewlines?: boolean;
}

export interface ScrapedSite {
    baseUrl: string;
    pages: ScrapedDocument[];
    lastUpdated: Date;
}