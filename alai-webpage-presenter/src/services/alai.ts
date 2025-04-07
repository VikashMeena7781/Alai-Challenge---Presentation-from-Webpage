import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Make sure to add this dependency
import { ScrapedContent } from './scraper';

export async function createPresentation(content: ScrapedContent, authToken: string): Promise<string> {
  console.log('Creating Alai presentation...');
  
  try {
    // Generate a UUID for the presentation
    const presentationId = uuidv4();
    
    // Step 1: Create a new presentation with correct endpoint
    const createResponse = await axios.post('https://alai-standalone-backend.getalai.com/create-new-presentation', {
      presentation_id: presentationId,
      presentation_title: `Presentation: ${content.title}`,
      create_first_slide: true,
      default_color_set_id: 0,
      theme_id: "a6bff6e5-3afc-4336-830b-fbc710081012" // Default theme ID observed in traffic
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`Created presentation with ID: ${presentationId}`);
    
    // Step 2: Get the first slide ID from the response
    const firstSlideId = createResponse.data.slides[0]?.id;
    if (!firstSlideId) {
      throw new Error('Failed to get slide ID from presentation creation');
    }
    
    // Step 3: Create title slide variant using the first layout type
    await createTitleSlideVariant(firstSlideId, content, authToken);
    
    // Step 4: Create additional content slide if we have enough content
    if (content.mainPoints.length > 0) {
      const contentSlideId = await createAdditionalSlide(presentationId, authToken);
      await createContentSlideVariant(contentSlideId, content, authToken);
    }
    
    return presentationId;
  } catch (error) {
    console.error('Error creating presentation:', error);
    throw new Error('Failed to create Alai presentation');
  }
}

async function createTitleSlideVariant(slideId: string, content: ScrapedContent, authToken: string): Promise<string> {
  console.log('Creating title slide variant...');
  try {
    const titleElementId = uuidv4();
    const response = await axios.post('https://alai-standalone-backend.getalai.com/create-slide-variant-from-element-slide', {
      slide_id: slideId,
      element_slide_variant: {
        type: "TITLE_AND_BODY_LAYOUT",
        elements: [
          [
            {
              id: titleElementId,
              type: "textbox",
              subtype: "heading",
              array_index: null,
              row_index: null,
              relative_position: {
                top: null,
                left: null
              },
              dimensions: {
                widthFraction: null,
                minHeight: "auto",
                manualHeight: 56,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 2,
                gridColumnCount: 24,
                horizontalAlignment: null,
                verticalAlignment: null
              },
              preset_type: "textbox_basic",
              content: content.title,
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ],
          [
            {
              id: uuidv4(),
              type: "textbox",
              subtype: "mixed",
              array_index: null,
              row_index: null,
              relative_position: {
                top: {
                  element_id: titleElementId, 
                  delta: "auto"
                },
                left: null
              },
              dimensions: {
                widthFraction: null,
                minHeight: "auto",
                manualHeight: 503,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 2,
                gridColumnCount: 24,
                horizontalAlignment: null,
                verticalAlignment: null
              },
              preset_type: "textbox_basic",
              content: content.description,
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ]
        ]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const variantId = response.data.id;
    console.log(`Created title slide variant with ID: ${variantId}`);
    
    // Update slide to set this variant as active
    await axios.post('https://alai-standalone-backend.getalai.com/set-active-variant', {
      slide_id: slideId,
      variant_id: variantId
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    return variantId;
  } catch (error) {
    console.error('Failed to create title slide variant:', error);
    throw error;
  }
}


async function createAdditionalSlide(presentationId: string, authToken: string): Promise<string> {
  console.log('Creating additional slide...');
  try {
    // Generate a slide ID first
    const slideId = uuidv4();
    
    // Create a new slide in the presentation using the correct endpoint
    const createSlideResponse = await axios.post('https://alai-standalone-backend.getalai.com/create-new-slide', {
      slide_id: slideId,
      presentation_id: presentationId,
      product_type: "PRESENTATION_CREATOR",  // Required field
      slide_order: 1,  // Second slide
      color_set_id: 0  // Match the presentation's color set
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`Created new slide with ID: ${slideId}`);
    return slideId; // Return the generated ID instead of relying on response
  } catch (error) {
    console.error('Failed to create additional slide:', error);
    throw error;
  }
}


async function createContentSlideVariant(slideId: string, content: ScrapedContent, authToken: string): Promise<string> {
  console.log('Creating Content slide variant...');
  let bulletPoints = "";
  if (content.mainPoints && content.mainPoints.length > 0) {
    bulletPoints = content.mainPoints
      .map(point => `• ${point}`)
      .join('\n');
  }
  
  try {
    // Using the simpler TITLE_AND_BODY_LAYOUT with exact payload structure
    const titleElementId = uuidv4();
    const response = await axios.post('https://alai-standalone-backend.getalai.com/create-slide-variant-from-element-slide', {
      slide_id: slideId,
      element_slide_variant: {
        type: "TITLE_AND_BODY_LAYOUT",
        elements: [
          [
            {
              id: titleElementId,
              type: "textbox",
              subtype: "heading",
              array_index: null,
              row_index: null,
              relative_position: {
                top: null,
                left: null
              },
              dimensions: {
                widthFraction: null,
                minHeight: "auto",
                manualHeight: 56,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 2,
                gridColumnCount: 24,
                horizontalAlignment: null,
                verticalAlignment: null
              },
              preset_type: "textbox_basic",
              content: content.title,
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ],
          [
            {
              id: uuidv4(),
              type: "textbox",
              subtype: "mixed",
              array_index: null,
              row_index: null,
              relative_position: {
                top: {
                  element_id: titleElementId, 
                  delta: "auto"
                },
                left: null
              },
              dimensions: {
                widthFraction: null,
                minHeight: "auto",
                manualHeight: 503,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 2,
                gridColumnCount: 24,
                horizontalAlignment: null,
                verticalAlignment: null
              },
              preset_type: "textbox_basic",
              content: bulletPoints,
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ]
        ]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const variantId = response.data.id;
    console.log(`Created title slide variant with ID: ${variantId}`);
    
    // Update slide to set this variant as active
    await axios.post('https://alai-standalone-backend.getalai.com/set-active-variant', {
      slide_id: slideId,
      variant_id: variantId
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    return variantId;
  } catch (error) {
    console.error('Failed to create slide variant:', error);
    throw error;
  }
}



export async function getShareableLink(presentationId: string, authToken: string): Promise<string> {
  console.log('Getting shareable link...');
  
  try {
    // This endpoint might need updating based on further investigation
    const shareResponse = await axios.post(`https://alai-standalone-backend.getalai.com/upsert-presentation-share`, {
      presentation_id: presentationId,
      public: true
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    return `https://app.getalai.com/view/${shareResponse.data}`;
  } catch (error) {
    console.error('Error getting shareable link:', error);
    throw new Error('Failed to get shareable link');
  }
}