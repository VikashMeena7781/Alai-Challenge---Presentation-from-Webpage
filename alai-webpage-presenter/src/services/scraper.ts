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

export async function scrapeWebpage(url: string): Promise<ScrapedContent> {
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
        formats: ["markdown", "html"], // <-- Updated to include both formats
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
    const html = response.data.data.html;
    const metadata = response.data.data.metadata || {};
    
    // Check if we have at least one format
    if (!markdown && !html) {
      throw new Error('API response contains neither markdown nor HTML data');
    }
    
    // Parse both formats if available
    const markdownData = markdown ? parseMarkdownContent(markdown, url, metadata) : null;
    const htmlData = html ? parseHtmlContent(html, url) : null;

    // Combine the data from both sources
    const combinedData = combineContentData(markdownData, htmlData, metadata);
    
    console.log('Webpage content scraped successfully!');
    return combinedData;
    
  } catch (error) {
    console.error('Error scraping webpage:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    }
    throw new Error('Failed to scrape webpage content');
  }
}

// New function to combine data from markdown and HTML sources
function combineContentData(
  markdownData: ScrapedContent | null, 
  htmlData: ScrapedContent | null,
  metadata: any
): ScrapedContent {
  // Create default result structure
  const result: ScrapedContent = {
    title: metadata.title || 'Untitled',
    description: 'No description available',
    mainPoints: [],
    imageUrls: []
  };
  
  // Title: Prefer markdown > html > metadata
  if (markdownData?.title && markdownData.title !== 'Untitled') {
    result.title = markdownData.title;
  } else if (htmlData?.title && htmlData.title !== 'Untitled') {
    result.title = htmlData.title;
  }
  
  // Description: Prefer markdown > html
  if (markdownData?.description && markdownData.description !== 'No description available') {
    result.description = markdownData.description;
  } else if (htmlData?.description && htmlData.description !== 'No description available') {
    result.description = htmlData.description;
  }
  
  // Main Points: Combine from both sources while avoiding duplicates
  const allMainPoints = new Set<string>();
  
  // Add markdown points first (higher quality)
  if (markdownData?.mainPoints) {
    markdownData.mainPoints.forEach(point => allMainPoints.add(point));
  }
  
  // Add HTML points if not similar to existing ones
  if (htmlData?.mainPoints) {
    htmlData.mainPoints.forEach(point => {
      if (!isPointDuplicate(point, Array.from(allMainPoints))) {
        allMainPoints.add(point);
      }
    });
  }
  
  result.mainPoints = Array.from(allMainPoints).slice(0, 5);
  
  // Images: Combine unique images from both sources
  const allImages = new Set<string>();
  
  // Add markdown images first
  if (markdownData?.imageUrls) {
    markdownData.imageUrls.forEach(img => allImages.add(img));
  }
  
  // Add HTML images (if not already in set)
  if (htmlData?.imageUrls) {
    htmlData.imageUrls.forEach(img => allImages.add(img));
  }
  
  result.imageUrls = Array.from(allImages).slice(0, 5);
  
  console.log('Combined content data:', result);
  return result;
}

// Helper function to detect if a point is too similar to existing points
function isPointDuplicate(newPoint: string, existingPoints: string[]): boolean {
  const newLower = newPoint.toLowerCase();
  
  for (const existing of existingPoints) {
    const existingLower = existing.toLowerCase();
    
    // Check for significant overlap
    if (newLower.includes(existingLower) || 
        existingLower.includes(newLower) ||
        calculateSimilarity(newLower, existingLower) > 0.7) {
      return true;
    }
  }
  
  return false;
}

// Simple text similarity calculation
function calculateSimilarity(text1: string, text2: string): number {
  // Convert texts to word sets
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Count intersections
  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }
  
  // Calculate Jaccard similarity
  return intersection / (words1.size + words2.size - intersection);
}

// Parse markdown content from Firecrawl API
function parseMarkdownContent(markdown: string, baseUrl: string, metadata: any): ScrapedContent {
  // Extract title from metadata or from markdown
  const title = metadata.title || extractTitleFromMarkdown(markdown) || 'Untitled';
  
  // Extract description - first substantial paragraph 
  const description = extractDescriptionFromMarkdown(markdown) || 'No description available';
  
  // Extract main points - headers in markdown
  const mainPoints = extractMainPointsFromMarkdown(markdown);
  
  // Extract image URLs - look for markdown image syntax ![alt](url)
  const imageUrls = extractImagesFromMarkdown(markdown, baseUrl);
  
  const result = {
    title,
    description,
    mainPoints: mainPoints.slice(0, 5), // Limit to 5 main points
    imageUrls
  };
  
  console.log('Parsed markdown data:', result);
  return result;
}

// Helper function to extract title from markdown
function extractTitleFromMarkdown(markdown: string): string | null {
  // Look for first # header
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  
  // Look for emphasized text that might be a title
  const emphasisMatch = markdown.match(/^\*\*(.+?)\*\*$/m);
  if (emphasisMatch && emphasisMatch[1]) {
    return emphasisMatch[1].trim();
  }
  
  return null;
}

// Helper function to extract description from markdown
function extractDescriptionFromMarkdown(markdown: string): string | null {
  // Find the first paragraph that doesn't look like a link or header
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && 
        trimmedLine.length > 30 && 
        !trimmedLine.startsWith('#') && 
        !trimmedLine.startsWith('!') && 
        !trimmedLine.match(/^\[.+?\]\(.+?\)$/)) {
      return trimmedLine;
    }
  }
  return null;
}

// Helper function to extract main points from markdown
function extractMainPointsFromMarkdown(markdown: string): string[] {
  const points: string[] = [];
  
  // Match all headers (## Header, ### Header, #### Header)
  const headerRegex = /^(#{2,4})\s+(.+)$/gm;
  let match;
  
  // Using exec in a loop to get all matches
  while ((match = headerRegex.exec(markdown)) !== null) {
    if (points.length >= 5) break;
    points.push(match[2].trim());
  }
  
  // If not enough headers, look for bold text as potential points
  if (points.length < 3) {
    const boldRegex = /\*\*(.+?)\*\*/g;
    while ((match = boldRegex.exec(markdown)) !== null) {
      if (points.length >= 5) break;
      if (match[1].length > 15) {  // Only consider substantial bold text
        points.push(match[1].trim());
      }
    }
  }
  
  // If still not enough, use paragraphs
  if (points.length < 3) {
    const lines = markdown.split('\n');
    for (const line of lines) {
      if (points.length >= 5) break;
      const trimmedLine = line.trim();
      if (trimmedLine.length > 50 && 
          !trimmedLine.startsWith('#') && 
          !trimmedLine.startsWith('!') && 
          !trimmedLine.includes('](')) {
        points.push(trimmedLine);
      }
    }
  }
  
  return points;
}

// Helper function to extract images from markdown
function extractImagesFromMarkdown(markdown: string, baseUrl: string): string[] {
  const imageUrls: string[] = [];
  
  // Match markdown image syntax ![alt](url)
  const imageRegex = /!\[.*?\]\((.+?)\)/g;
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    if (imageUrls.length >= 5) break;
    let imageUrl = match[1].trim();
    
    // Convert relative URLs to absolute
    if (!imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, baseUrl).toString();
      } catch (e) {
        console.warn(`Failed to convert relative URL: ${imageUrl}`);
        continue;
      }
    }
    
    imageUrls.push(imageUrl);
  }
  
  return imageUrls;
}

// Parse HTML content using cheerio
function parseHtmlContent(html: string, baseUrl: string): ScrapedContent {
  const $ = cheerio.load(html);
  
  // Extract title
  const title = $('title').text() || $('h1').first().text() || 'Untitled';
  
  // Extract description/meta description
  const description = $('meta[name="description"]').attr('content') || 
                      $('p').first().text() || 
                      'No description available';
  
  // Extract main points (h2, h3 elements or significant paragraphs)
  const mainPoints: string[] = [];
  $('h2, h3').each((i, el) => {
    const text = $(el).text().trim();
    if (text) mainPoints.push(text);
  });
  
  if (mainPoints.length < 3) {
    $('p').each((i, el) => {
      if (mainPoints.length >= 5) return;
      const text = $(el).text().trim();
      if (text && text.length > 50) mainPoints.push(text);
    });
  }
  
  // Extract images
  const imageUrls: string[] = [];
  $('img').each((i, el) => {
    if (imageUrls.length >= 5) return;
    let src = $(el).attr('src');
    if (src) {
      // Convert relative URLs to absolute
      if (!src.startsWith('http')) {
        try {
          src = new URL(src, baseUrl).toString();
        } catch (e) {
          console.warn(`Failed to convert relative URL: ${src}`);
          return;
        }
      }
      imageUrls.push(src);
    }
  });
  
  const result = {
    title,
    description,
    mainPoints: mainPoints.slice(0, 5), // Limit to 5 main points
    imageUrls
  };
  
  console.log('Parsed HTML data:', result);
  return result;
}