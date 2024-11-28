import { DocumentScraper } from './scraper';

async function main() {
    const url = process.argv[2];
    
    if (!url) {
        console.error('Please provide a URL as an argument');
        console.log('Usage: npm start -- https://example.com');
        process.exit(1);
    }

    const scraper = new DocumentScraper({
        maxDepth: 3,
        checkSublinks: true,
        saveToFile: true,
        outputDir: 'scraped-data',
        timeout: 60000
    });
    
    try {
        console.log('Initializing scraper...');
        await scraper.initialize();
        
        console.log(`Starting scrape of: ${url}`);
        const scrapedDoc = await scraper.scrapeUrl(url);
        
        if (scrapedDoc) {
            console.log('\nScraping completed!');
            console.log('Title:', scrapedDoc.title);
            console.log('Summary:', scrapedDoc.summary);
            console.log(`Sections: ${scrapedDoc.sections.length}`);
            console.log(`Code blocks: ${scrapedDoc.codeBlocks.length}`);
            
            if (scrapedDoc.sublinks?.length) {
                console.log('\nSublink Status Summary:');
                const active = scrapedDoc.sublinks.filter(link => link.active).length;
                console.log(`Active links: ${active}/${scrapedDoc.sublinks.length}`);
            }

            // Save all scraped data at the end
            await scraper.saveToFile();
        } else {
            console.log('Failed to scrape the initial URL');
        }
    } catch (error) {
        console.error('Error during scraping:', error);
        process.exit(1);
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    main();
}

export { DocumentScraper };