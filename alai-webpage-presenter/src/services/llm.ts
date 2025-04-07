import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface SlideData {
  layout: 'TITLE_AND_BODY_LAYOUT' | 'IMAGE_ONLY_LAYOUT' | 'TEXT_SECTIONS_AND_CONCLUSION_LAYOUT' | 'TITLE_AND_TIMELINE_LAYOUT' | 'TITLE_AND_TABLE_LAYOUT';
  title: string;
  content: any; // Structure varies based on layout type
}

export async function generateSlidesFromMarkdown(markdown: string, baseUrl: string): Promise<SlideData[]> {
  // Select the Gemini Pro model
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  // Create the prompt for slide generation with the raw markdown
  const prompt = `
  You are a professional presentation designer. Transform this markdown content into slides for a compelling presentation:

  ${markdown}
  
  Analyze the content thoroughly and create 3-7 slides that best present the information.
  Choose the most appropriate layout for each slide from these options:
  
  1. TITLE_AND_BODY_LAYOUT - For slides with a title and paragraphs of text
  2. IMAGE_ONLY_LAYOUT - For slides with a title and a single prominent image
  3. TEXT_SECTIONS_AND_CONCLUSION_LAYOUT - For slides with a title and content organized in sections (rows and columns)
  4. TITLE_AND_TIMELINE_LAYOUT - For slides showing sequential events or processes
  5. TITLE_AND_TABLE_LAYOUT - For slides presenting tabular data
  
  Output must be a valid JSON array of slide objects. Each slide object must have:
  1. "layout": One of the five layout types listed above (as a string)
  2. "title": A concise, engaging slide title
  3. "content": Structure depends on layout type:
     - For TITLE_AND_BODY_LAYOUT: { "body": "text content" }
     - For IMAGE_ONLY_LAYOUT: { "imageUrl": "url of image", "imageCaption": "caption" }
     - For TEXT_SECTIONS_AND_CONCLUSION_LAYOUT: { 
         "sections": [{"heading": "section heading", "content": "section content"}, ...], 
         "conclusion": "conclusion text" 
       }
     - For TITLE_AND_TIMELINE_LAYOUT: { 
         "events": [{"time": "time point", "title": "event title", "description": "description"}, ...] 
       }
     - For TITLE_AND_TABLE_LAYOUT: { 
         "headers": ["header1", "header2", ...], 
         "rows": [["cell1", "cell2", ...], ...] 
       }
  
  Extract image URLs from the markdown when appropriate.
  If you find image markdown links like ![text](url), include those URLs in IMAGE_ONLY_LAYOUT slides.
  Convert relative URLs to absolute using the base URL: ${baseUrl}
  
  Ensure the slides flow logically, have engaging titles, and effectively communicate the main points.
  
  Return ONLY the JSON array with no additional text or explanation.
  `;

  try {
    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response. Raw response:', text);
      throw new Error('Failed to extract JSON from Gemini response');
    }
    
    // Parse the JSON
    const slides = JSON.parse(jsonMatch[0]) as SlideData[];
    console.log(`Generated ${slides.length} slides from markdown`);
    
    return slides;
    
  } catch (error) {
    console.error('Error generating slides with Gemini:', error);
    throw new Error('Failed to generate slides with AI');
  }
}