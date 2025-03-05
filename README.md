Please don't use this for unethical reasons ser


# Documentation Scraper Setup Guide
What This Does
This tool scrapes and saves documentation from websites into structured JSON files.
Prerequisites
Install Node.js (LTS version)
Install Git
A code editor like Visual Studio Code

## Setup Steps 🚀

1. Get the Code
git clone [your-repository-url]
cd [repository-name]

2. Install Dependencies
npm install

3. Run the Scraper
Based on the source code (src/index.ts), you run it like this:
npm start -- https://your-documentation-url.com

## Configuration Options 🛠️
You can modify these options when creating the scraper (defaults shown):
const scraper = new DocumentScraper({
   1. maxDepth: 3,          // How deep to follow links
   2. checkSublinks: true,  // Check if links are working
   3. saveToFile: true,     // Save results to file
   4. outputDir: 'scraped-data',
   5. timeout: 60000        // 60 seconds timeout
});

## Output Location 📁
Scraped data is automatically saved to the scraped-data folder
Files are named after the domain being scraped
Data is saved in JSON format

## What Gets Scraped 📝
The scraper will collect:
Page titles,
Summaries,
Full text content,
Code blocks,
Section headers,
Metadata,
Sublinks (if enabled)
