import * as dotenv from 'dotenv';
import { scrapeWebpage } from './services/scraper';
import { createPresentation, getShareableLink } from './services/alai';
import { authenticate } from './services/auth';

dotenv.config();

async function main() {
  try {
    // Get URL from command line argument
    const url = process.argv[2];
    if (!url) {
      console.error('Please provide a URL as an argument');
      process.exit(1);
    }

    console.log(`Processing webpage: ${url}`);
    
    // Step 1: Scrape the webpage
    const webpageContent = await scrapeWebpage(url);
    
    // Step 2: Authenticate with Alai
    const authToken = await authenticate();
    
    // Step 3: Create presentation
    const presentationId = await createPresentation(webpageContent, authToken);
    
    // Step 4: Get shareable link
    const shareableLink = await getShareableLink(presentationId, authToken);
    
    console.log(`✅ Presentation created successfully!`);
    console.log(`Shareable link: ${shareableLink}`);

  } catch (error) {
    console.error('Error creating presentation:', error);
    process.exit(1);
  }
}

main();