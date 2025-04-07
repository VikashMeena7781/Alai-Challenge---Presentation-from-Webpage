import axios from 'axios';
import * as cheerio from 'cheerio';
const fs = require('fs');
const path = require('path');

export interface ScrapedContent {
  title: string;
  description: string;
  mainPoints: string[];
  imageUrls: string[];
}

export async function scrapeWebpage(url: string): Promise<string> {
  console.log('Scraping webpage content...');
  
  // Check API key is set
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY is not set in environment variables');
    throw new Error('API key not configured');
  }
  
  try {
    // Request BOTH markdown AND html formats from the API
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', 
      {
        url: url,
        formats: ["markdown"], 
        onlyMainContent: true,
        waitFor: 5000,
        timeout: 30000,
        removeBase64Images: true,
        blockAds: true
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API response received');
    
    // Extract data from response
    if (!response.data.data) {
      console.warn('Warning: Unexpected API response format');
      throw new Error('Invalid API response structure');
    }
    
    const markdown = response.data.data.markdown;
    const metadata = response.data.data.metadata || {};
    
    // Check if we have at least one format
    if (!markdown) {
      throw new Error('API response contains does not contain markdown data');
    }
    
    console.log('Webpage content scraped successfully!');
    return markdown;
    
  } catch (error) {
    console.error('Error scraping webpage:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    }
    throw new Error('Failed to scrape webpage content');
  }
}
