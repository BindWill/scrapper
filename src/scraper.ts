import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ScraperOptions, ScrapedDocument, LinkStatus, DocumentSection, CodeBlock, ScrapedSite } from './types';
import { TextProcessor } from './textProcessor';

export class DocumentScraper {
    private browser: Browser | null = null;
    private visitedUrls: Set<string> = new Set();
    private textProcessor: TextProcessor;
    private options: Required<ScraperOptions>;
    private scrapedPages: ScrapedDocument[] = [];

    constructor(options?: ScraperOptions) {
        this.textProcessor = new TextProcessor();
        this.options = {
            headless: true,
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            maxDepth: 2,
            checkSublinks: true,
            saveToFile: true,
            outputDir: 'scraped-data',
            ...options
        };
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async extractContent($: cheerio.CheerioAPI): Promise<{
        title: string;
        summary: string;
        fullText: string;
        sections: DocumentSection[];
        codeBlocks: CodeBlock[];
    }> {
        const title = $('h1').first().text().trim() || 
                     $('title').text().trim() || 
                     $('meta[property="og:title"]').attr('content')?.trim() || '';

        const mainContent = $('main, article, .content, .documentation, .doc-content').first();

        const summary = mainContent.find('p').first().text().trim() ||
                       $('meta[name="description"]').attr('content')?.trim() || '';

        const fullText = mainContent.text().trim();

        const sections: DocumentSection[] = [];
        const headings = mainContent.find('h1, h2, h3, h4, h5, h6');
        
        headings.each((_, el) => {
            const $el = $(el);
            const level = parseInt(el.tagName.toLowerCase().replace('h', ''));
            const heading = $el.text().trim();
            
            let content = '';
            let $current = $el.next();
            
            while ($current.length && !$current.is('h1, h2, h3, h4, h5, h6')) {
                if ($current.is('p, li, td, pre, div:not(.code-block)')) {
                    const text = $current.clone().find('code, pre').remove().end().text().trim();
                    if (text) {
                        content += text + '\n\n';
                    }
                }
                $current = $current.next();
            }

            if (heading && content) {
                sections.push({
                    heading: this.textProcessor.cleanText(heading),
                    content: this.textProcessor.cleanText(content),
                    level,
                    subsections: []
                });
            }
        });

        const codeBlocks: CodeBlock[] = [];
        mainContent.find('pre code, .highlight code, .code-block, pre.language-*, code[class*="language-"]').each((_, el) => {
            const $el = $(el);
            const language = $el.attr('class')?.split(/\s+/)
                .find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'text';
            
            const code = $el.text().trim();
            const context = $el.parent().prev('p, h3, h4').text().trim();
            const filename = $el.parent().prev('.filename, [data-filename]').text().trim();

            if (code) {
                codeBlocks.push({
                    language,
                    code,
                    context: context || undefined,
                    filename: filename || undefined
                });
            }
        });

        return { title, summary, fullText, sections, codeBlocks };
    }

    public async saveToFile(): Promise<void> {
        if (!this.options.saveToFile) return;

        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
            const baseUrl = Array.from(this.visitedUrls)[0] || '';
            const hostname = new URL(baseUrl).hostname;
            const filename = `${hostname.replace(/[^a-z0-9]/gi, '_')}_full.json`;
            const filepath = path.join(this.options.outputDir, filename);

            const siteData: ScrapedSite = {
                baseUrl,
                pages: this.scrapedPages,
                lastUpdated: new Date()
            };

            await fs.writeFile(filepath, JSON.stringify(siteData, null, 2));
            console.log(`Saved all data to ${filepath}`);
        } catch (error) {
            console.error('Error saving to file:', error);
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    private isSameDomain(url1: string, url2: string): boolean {
        try {
            const domain1 = new URL(url1).hostname;
            const domain2 = new URL(url2).hostname;
            return domain1 === domain2;
        } catch {
            return false;
        }
    }

    private async checkLinkStatus(url: string): Promise<LinkStatus> {
        if (!this.browser) throw new Error('Browser not initialized');
        
        const page = await this.browser.newPage();
        try {
            const response = await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });
            const status = response?.status() ?? 404;
            
            return {
                url,
                status,
                active: status >= 200 && status < 400
            };
        } catch (error) {
            return {
                url,
                status: 0,
                active: false,
                error: (error as Error).message
            };
        } finally {
            await page.close();
        }
    }

    private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
        const links = await page.evaluate(() => 
            Array.from(document.querySelectorAll('a'))
                .map(link => link.href)
                .filter(href => href && !href.startsWith('#'))
        );

        return links
            .filter(link => this.isValidUrl(link))
            .filter(link => this.isSameDomain(link, baseUrl));
    }

    async scrapeUrl(url: string, depth = 0): Promise<ScrapedDocument | null> {
        if (!this.browser) throw new Error('Browser not initialized');

        if (depth > 0 && url.includes('#')) {
            console.log(`Skipping fragment URL: ${url}`);
            return null;
        }

        await this.delay(2000);
        console.log(`Scraping ${url} (depth: ${depth})`);
        
        this.visitedUrls.add(url);
        const page = await this.browser.newPage();
        await page.setUserAgent(this.options.userAgent);
        await page.setDefaultTimeout(this.options.timeout);

        try {
            const response = await page.goto(url, { 
                waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
                timeout: this.options.timeout 
            });

            if (!response?.ok()) {
                console.log(`Skipping ${url} - Status: ${response?.status()}`);
                return null;
            }

            await page.waitForSelector('main, article, .content, .documentation, .doc-content', {
                timeout: this.options.timeout
            });

            await this.delay(3000);

            const content = await page.content();
            const $ = cheerio.load(content);

            $('.navbar, .menu, .toc, script, style, nav, footer, header, .sidebar, .navigation').remove();

            const { title, summary, fullText, sections, codeBlocks } = await this.extractContent($);

            let sublinks: LinkStatus[] = [];
            if (this.options.checkSublinks && depth < this.options.maxDepth) {
                const links = await this.extractLinks(page, url);
                console.log(`Found ${links.length} sublinks on ${url}`);
                sublinks = await Promise.all(links.map(link => this.checkLinkStatus(link)));

                for (const link of links) {
                    if (!this.visitedUrls.has(link)) {
                        await this.scrapeUrl(link, depth + 1);
                    }
                }
            }

            const scrapedDoc: ScrapedDocument = {
                url,
                title,
                summary,
                fullText,
                sections,
                codeBlocks,
                metadata: {
                    description: $('meta[name="description"]').attr('content'),
                    lastUpdated: new Date(),
                    keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()),
                    author: $('meta[name="author"]').attr('content')
                },
                sublinks
            };

            this.scrapedPages.push(scrapedDoc);
            return scrapedDoc;

        } catch (error) {
            console.log(`Error scraping ${url}: ${(error as Error).message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    async initialize(): Promise<void> {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}