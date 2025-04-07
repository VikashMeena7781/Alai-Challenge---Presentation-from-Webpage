import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Make sure to add this dependency
import { ScrapedContent } from './scraper';
import { SlideData } from './llm';

export async function createPresentation(slides: SlideData[], authToken: string): Promise<string> {
  console.log('Creating Alai presentation...');
  
  try {
    // Generate a UUID for the presentation
    const presentationId = uuidv4();
    
    // Step 1: Create a new presentation with correct endpoint
    const createResponse = await axios.post('https://alai-standalone-backend.getalai.com/create-new-presentation', {
      presentation_id: presentationId,
      presentation_title: `Presentation: ${slides[0].title}`, 
      create_first_slide: true,
      default_color_set_id: 0,
      theme_id: "a6bff6e5-3afc-4336-830b-fbc710081012"
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
    
    // Step 3: Create the first slide variant based on its layout type
    await createSlideVariantByType(firstSlideId, slides[0], authToken);
    
    // Step 4: Create additional slides if we have them
    for (let i = 1; i < slides.length; i++) {
      console.log(`Creating slide ${i+1} of ${slides.length}...`);
      const slideId = await createNewSlide(presentationId, authToken, i);
      await createSlideVariantByType(slideId, slides[i], authToken);
    }
    
    return presentationId;
  } catch (error) {
    console.error('Error creating presentation:', error);
    throw new Error('Failed to create Alai presentation');
  }
}

// Helper function to create the appropriate slide variant based on layout type
async function createSlideVariantByType(slideId: string, slideData: SlideData, authToken: string): Promise<string> {
  switch (slideData.layout) {
    case 'TITLE_AND_BODY_LAYOUT':
      return createTitleBODYSlideVariant(slideId, slideData, authToken);
    case 'IMAGE_ONLY_LAYOUT':
      return createImageOnlyVariant(slideId, slideData, authToken);
    case 'TEXT_SECTIONS_AND_CONCLUSION_LAYOUT':
      console.log('Creating TEXT_SECTIONS_AND_CONCLUSION_LAYOUT');
      return createTextSectionAndConclusionSlideVariant(slideId, slideData, authToken); 
    case 'TITLE_AND_TIMELINE_LAYOUT':
      console.log('Creating TITLE_AND_TIMELINE_LAYOUT');
      return createTitleAndTimelineSlideVariant(slideId, slideData, authToken); 
    case 'TITLE_AND_TABLE_LAYOUT':
      console.log('Creating TITLE_AND_TABLE_LAYOUT');
      return createTitleAndTableSlideVariant(slideId, slideData, authToken); 
    default:
      console.warn(`Unknown layout type: ${slideData.layout}, falling back to TITLE_AND_BODY_LAYOUT`);
      return createTitleBODYSlideVariant(slideId, slideData, authToken);
  }
}


// Function for Title and Timeline Slide Variant
async function createTitleAndTimelineSlideVariant(slideId: string, slide: SlideData, authToken: string): Promise<string> {
  console.log('Creating timeline slide variant...');
  
  if (slide.layout !== 'TITLE_AND_TIMELINE_LAYOUT' || !slide.content?.events || !Array.isArray(slide.content.events)) {
    console.warn('Missing events data for TITLE_AND_TIMELINE_LAYOUT slide');
    return createTitleBODYSlideVariant(slideId, slide, authToken); // Fallback
  }
  
  try {
    // Generate UUIDs for elements
    const titleElementId = uuidv4();
    const timelineContainerId = uuidv4();
    
    // Extract events from the slide data and process content
    const events = slide.content.events.map((event: any) => ({
      time: processContent(event.time || ""),
      title: processContent(event.title || ""),
      description: processContent(event.description || "")
    }));
    
    // Create timeline event elements
    const timelineElements = [];
    let eventIndex = 0;
    const timelineLineId = uuidv4(); // ID for the timeline line UI element
    
    // Create event elements
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventContainerId = uuidv4();
      const headingElementId = uuidv4();
      const bodyElementId = uuidv4();
      
      // Determine row index based on alternating pattern (0 for top, 2 for bottom)
      const rowIndex = i % 2 === 0 ? 2 : 0;
      
      // Create event container with heading and body text
      const eventContainer = {
        id: eventContainerId,
        type: "container",
        subtype: "timeline_event",
        array_index: eventIndex++,
        row_index: rowIndex,
        relative_position: null,
        dimensions: {
          widthFraction: null,
          minHeight: "auto",
          manualHeight: null,
          height: null,
          width: null,
          paddingHorizontal: "auto",
          paddingVertical: "auto",
          shouldRecalculate: false,
          minGridColumnCount: 12,
          gridColumnCount: "auto"
        },
        parent_id: timelineContainerId,
        preset_type: null,
        elements: [
          {
            id: headingElementId,
            type: "textbox",
            subtype: "timeline_heading_text",
            array_index: 0,
            row_index: "auto",
            relative_position: null,
            dimensions: {
              widthFraction: null,
              minHeight: "auto",
              manualHeight: null,
              height: null,
              width: null,
              paddingHorizontal: "auto",
              paddingVertical: "auto",
              shouldRecalculate: false,
              minGridColumnCount: 2,
              gridColumnCount: "auto",
              horizontalAlignment: null,
              verticalAlignment: null
            },
            parent_id: eventContainerId,
            preset_type: null,
            content: `## ${event.title}`,
            prose_mirror_content: null,
            background: {
              fill: null,
              outline: null
            }
          },
          {
            id: bodyElementId,
            type: "textbox",
            subtype: "timeline_body_text",
            array_index: 1,
            row_index: "auto",
            relative_position: null,
            dimensions: {
              widthFraction: null,
              minHeight: "auto",
              manualHeight: null,
              height: null,
              width: null,
              paddingHorizontal: "auto",
              paddingVertical: "auto",
              shouldRecalculate: false,
              minGridColumnCount: 2,
              gridColumnCount: "auto",
              horizontalAlignment: null,
              verticalAlignment: null
            },
            parent_id: eventContainerId,
            preset_type: null,
            content: event.description,
            prose_mirror_content: null,
            background: {
              fill: null,
              outline: null
            }
          }
        ],
        has_equal_children_width: false,
        event_index: i
      };
      
      timelineElements.push(eventContainer);
      
      // Add the timeline line UI element in the middle of the events
      if (i === Math.floor(events.length / 2) - 1) {
        timelineElements.push({
          id: timelineLineId,
          type: "ui_only",
          subtype: "timeline_line",
          array_index: eventIndex++,
          row_index: 1,
          relative_position: null,
          dimensions: {
            widthFraction: null,
            minHeight: "auto",
            manualHeight: null,
            height: "auto",
            width: "auto",
            paddingHorizontal: "auto",
            paddingVertical: "auto",
            shouldRecalculate: false,
            minGridColumnCount: 2,
            gridColumnCount: "auto"
          },
          parent_id: timelineContainerId,
          preset_type: null
        });
      }
    }
    
    // Create the payload
    const response = await axios.post('https://alai-standalone-backend.getalai.com/create-slide-variant-from-element-slide', {
      slide_id: slideId,
      element_slide_variant: {
        type: "TITLE_AND_TIMELINE_LAYOUT",
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
                manualHeight: null,
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
              content: processContent(slide.title),
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ],
          [
            {
              id: timelineContainerId,
              type: "container",
              subtype: "timeline",
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
                manualHeight: null,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 18,
                gridColumnCount: 24
              },
              preset_type: "timeline_marker",
              elements: timelineElements,
              has_equal_children_width: false,
              num_events: events.length,
              direction: "horizontal",
              orientation: "alternating",
              content_type: "heading_and_description",
              preset_styles: {
                type: "timeline_marker",
                body_alignment: "start",
                start_marker_style: null,
                end_marker_style: null,
                event_visual_element: null,
                icon_color: null,
                event_marker: "number"
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
    console.log(`Created timeline slide variant with ID: ${variantId}`);
    
    // Set this variant as active
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
    console.error('Failed to create timeline slide variant:', error);
    throw error;
  }
}

// Update the createNewSlide function to handle slide ordering
async function createNewSlide(presentationId: string, authToken: string, slideOrder: number = 1): Promise<string> {
  console.log(`Creating slide at position ${slideOrder+1}...`);
  try {
    // Generate a slide ID 
    const slideId = uuidv4();
    
    // Create a new slide in the presentation
    const createSlideResponse = await axios.post('https://alai-standalone-backend.getalai.com/create-new-slide', {
      slide_id: slideId,
      presentation_id: presentationId,
      product_type: "PRESENTATION_CREATOR",
      slide_order: slideOrder,
      color_set_id: 0
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`Created new slide with ID: ${slideId}`);
    return slideId;
  } catch (error) {
    console.error('Failed to create additional slide:', error);
    throw error;
  }
}


// Function for Title and Table Slide Variant
async function createTitleAndTableSlideVariant(slideId: string, slide: SlideData, authToken: string): Promise<string> {
  console.log('Creating table slide variant...');
  
  if (slide.layout !== 'TITLE_AND_TABLE_LAYOUT' || !slide.content?.headers || !slide.content?.rows) {
    console.warn('Missing table data for TITLE_AND_TABLE_LAYOUT slide');
    return createTitleBODYSlideVariant(slideId, slide, authToken); // Fallback
  }
  
  try {
    // Generate UUIDs for elements
    const titleElementId = uuidv4();
    const tableContainerId = uuidv4();
    
     // Extract table data - Fixed type annotations
     const headers = slide.content.headers.map((header: string) => processContent(header));
     const rows = slide.content.rows.map((row: string[]) => row.map((cell: string) => processContent(cell)));

    // Validate table structure
    if (!Array.isArray(headers) || !Array.isArray(rows) || rows.some(row => !Array.isArray(row))) {
      console.warn('Invalid table structure, falling back to TITLE_AND_BODY_LAYOUT');
      return createTitleBODYSlideVariant(slideId, slide, authToken);
    }
    
    const numColumns = headers.length;
    const numRows = rows.length + 1; // +1 for header row
    
    // Create all table cells (including headers)
    const tableCells = [];
    let cellIndex = 0;
    
    // Add header cells (row 0)
    for (let col = 0; col < numColumns; col++) {
      tableCells.push({
        id: uuidv4(),
        type: "textbox",
        subtype: "table_cell",
        array_index: cellIndex++,
        row_index: 0,
        relative_position: null,
        dimensions: {
          widthFraction: null,
          minHeight: "auto",
          manualHeight: null,
          height: null,
          width: null,
          paddingHorizontal: "auto",
          paddingVertical: "auto",
          shouldRecalculate: false,
          minGridColumnCount: 2,
          gridColumnCount: "auto",
          horizontalAlignment: null,
          verticalAlignment: null
        },
        parent_id: tableContainerId,
        preset_type: null,
        content: headers[col],
        prose_mirror_content: null,
        background: {
          fill: null,
          outline: null
        },
        row: 0,
        column: col
      });
    }
    
    // Add data cells (rows 1 to n)
    for (let row = 0; row < rows.length; row++) {
      const dataRow = rows[row];
      
      // Ensure row has enough columns, pad with empty strings if needed
      const paddedRow = [...dataRow];
      while (paddedRow.length < numColumns) {
        paddedRow.push(""); // Pad with empty string
      }
      
      for (let col = 0; col < numColumns; col++) {
        tableCells.push({
          id: uuidv4(),
          type: "textbox",
          subtype: "table_cell",
          array_index: cellIndex++,
          row_index: row + 1, // +1 because header is row 0
          relative_position: null,
          dimensions: {
            widthFraction: null,
            minHeight: "auto",
            manualHeight: null,
            height: null,
            width: null,
            paddingHorizontal: "auto",
            paddingVertical: "auto",
            shouldRecalculate: false,
            minGridColumnCount: 2,
            gridColumnCount: "auto",
            horizontalAlignment: null,
            verticalAlignment: null
          },
          parent_id: tableContainerId,
          preset_type: null,
          content: paddedRow[col],
          prose_mirror_content: null,
          background: {
            fill: null,
            outline: null
          },
          row: row + 1,
          column: col
        });
      }
    }
    
    // Create the payload
    const response = await axios.post('https://alai-standalone-backend.getalai.com/create-slide-variant-from-element-slide', {
      slide_id: slideId,
      element_slide_variant: {
        type: "TITLE_AND_TABLE_LAYOUT",
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
                manualHeight: null,
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
              content: processContent(slide.title),
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ],
          [
            {
              id: tableContainerId,
              type: "container",
              subtype: "table",
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
                manualHeight: null,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 8,
                gridColumnCount: 24,
                cellMargin: "auto",
                maxColumnCount: 10
              },
              preset_type: "table_basic",
              elements: tableCells,
              has_equal_children_width: false,
              num_rows: numRows,
              num_columns: numColumns,
              header_type: "top_only",
              preset_styles: {
                type: "table_basic"
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
    console.log(`Created table slide variant with ID: ${variantId}`);
    
    // Set this variant as active
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
    console.error('Failed to create table slide variant:', error);
    throw error;
  }
}

interface Section {
  heading: string;
  content: string;
}

// Function for Text Sections and Conclusion Slide Variant
async function createTextSectionAndConclusionSlideVariant(slideId: string, slide: SlideData, authToken: string): Promise<string> {
  console.log('Creating text sections slide variant...');
  
  if (slide.layout !== 'TEXT_SECTIONS_AND_CONCLUSION_LAYOUT' || !slide.content?.sections) {
    console.warn('Missing sections for TEXT_SECTIONS_AND_CONCLUSION_LAYOUT slide');
    return createTitleBODYSlideVariant(slideId, slide, authToken); // Fallback
  }
  
  try {
    // Generate UUIDs for elements
    const titleElementId = uuidv4();
    const sectionsContainerId = uuidv4();
    const conclusionElementId = uuidv4();
    
    // Extract sections from the slide data
    const sections = slide.content.sections as Section[];
    const conclusion = processContent(slide.content.conclusion || ' ');
    
    
    const sectionElements = sections.map((section: Section, index: number) => {
      return {
        id: uuidv4(),
        type: "textbox",
        subtype: "section_body_text",
        array_index: 0,
        row_index: "auto",
        relative_position: "auto",
        dimensions: {
          widthFraction: null,
          minHeight: "auto",
          manualHeight: null,
          height: null,
          width: null,
          paddingHorizontal: "auto",
          paddingVertical: "auto",
          shouldRecalculate: false,
          minGridColumnCount: 2,
          gridColumnCount: "auto",
          horizontalAlignment: null,
          verticalAlignment: null
        },
        parent_id: sectionsContainerId,
        preset_type: null,
        content: `## ${index + 1}. ${processContent(section.heading)}\n${processContent(section.content)}`,
        prose_mirror_content: null,
        background: {
          fill: null,
          outline: null
        }
      };
    });
    
    // Determine how many sections to show in the first row (2-3 is typical)
    const numberOfFirstRowElements = sections.length <= 3 ? sections.length : 3;
    
    // Create the payload
    const response = await axios.post('https://alai-standalone-backend.getalai.com/create-slide-variant-from-element-slide', {
      slide_id: slideId,
      element_slide_variant: {
        type: "TEXT_SECTIONS_AND_CONCLUSION_LAYOUT",
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
                manualHeight: null,
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
              content: slide.title,
              prose_mirror_content: null,
              background: {
                fill: null,
                outline: null
              }
            }
          ],
          [
            {
              id: sectionsContainerId,
              type: "container",
              subtype: "sections_container",
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
                manualHeight: null,
                height: null,
                width: null,
                paddingHorizontal: "auto",
                paddingVertical: "auto",
                shouldRecalculate: false,
                minGridColumnCount: 12,
                gridColumnCount: 24
              },
              preset_type: "section_simple_card",
              elements: sectionElements,
              has_equal_children_width: true,
              number_of_first_row_elements: numberOfFirstRowElements,
              section_type: "text"
            }
          ],
          [
            {
              id: conclusionElementId,
              type: "textbox",
              subtype: "mixed",
              array_index: null,
              row_index: null,
              relative_position: {
                top: {
                  element_id: sectionsContainerId,
                  delta: "auto"
                },
                left: null
              },
              dimensions: {
                widthFraction: null,
                minHeight: "auto",
                manualHeight: null,
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
              content: conclusion,
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
    console.log(`Created text sections slide variant with ID: ${variantId}`);
    
    // Set this variant as active
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
    console.error('Failed to create text sections slide variant:', error);
    throw error;
  }
}

// Function for Image Only Slide Variant
async function createImageOnlyVariant(slideId: string, content: SlideData, authToken: string): Promise<string> {
  console.log('Creating image slide variant...');
  
  if (content.layout !== 'IMAGE_ONLY_LAYOUT' || !content.content?.imageUrl) {
    console.warn('Missing image URL for IMAGE_ONLY_LAYOUT slide');
  }
  
  try {
    const titleElementId = uuidv4();
    const containerElementId = uuidv4();
    const imageElementId = uuidv4();

    const imageUrl = content.content?.imageUrl || null;
    
    const response = await axios.post('https://alai-standalone-backend.getalai.com/create-slide-variant-from-element-slide', {
      slide_id: slideId,
      element_slide_variant: {
      type: "IMAGE_ONLY_LAYOUT",
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
          manualHeight: null,
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
          content: processContent(content.title),
          prose_mirror_content: null,
          background: {
          fill: null,
          outline: null
          }
        }
        ],
        [
        {
          id: containerElementId,
          type: "container",
          subtype: "image_container",
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
          manualHeight: 300,
          height: null,
          width: null,
          paddingHorizontal: "auto",
          paddingVertical: "auto",
          shouldRecalculate: false,
          minGridColumnCount: 2,
          gridColumnCount: 24
          },
          preset_type: "image_basic",
          elements: [
          {
            id: imageElementId,
            type: "image",
            subtype: "top_level_image",
            array_index: 0,
            row_index: 0,
            relative_position: null,
            dimensions: {
            widthFraction: null,
            minHeight: "auto",
            manualHeight: null,
            height: null,
            width: null,
            paddingHorizontal: "auto",
            paddingVertical: "auto",
            shouldRecalculate: false,
            minGridColumnCount: 2,
            gridColumnCount: "auto",
            crop: "auto"
            },
            parent_id: containerElementId,
            preset_type: null,
            content: {
            asset_id: null,
            image_url: imageUrl,
            // FIXED: Changed 'USER_UPLOADED_IMAGE' to 'USER_UPLOADED'
            image_type: imageUrl ? "USER_UPLOADED" : "PLACEHOLDER_IMAGE",
            mime_type: getMimeType(imageUrl)
            },
            image_settings: "auto"
          }
          ],
          has_equal_children_width: false
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
    console.log(`Created image slide variant with ID: ${variantId}`);
    
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
    console.error('Failed to create image slide variant:', error);
    throw error;
  }
}

function getMimeType(url: string | undefined): string {
  if (!url) return "image/jpeg"; // Default
  
  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'svg': return 'image/svg+xml';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif'; // Added proper GIF support
    case 'webp': return 'image/webp';
    case 'bmp': return 'image/bmp';
    case 'ico': return 'image/x-icon';
    case 'tiff':
    case 'tif': return 'image/tiff';
    case 'avif': return 'image/avif';
    default: 
      // For URLs without clear extensions but containing image patterns
      if (url.includes('gif')) return 'image/gif';
      return 'image/jpeg'; // Default fallback
  }
}

// Function for Title and Body Slide Variant
async function createTitleBODYSlideVariant(slideId: string, slide: SlideData, authToken: string): Promise<string> {
  console.log('Creating title slide variant...');
  let title = processContent(slide.title);
  let data = processContent(slide.content.body || '');
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
              content: title,
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
              content: data,
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



function processContent(text: string, preserveMarkdown: boolean = false): string {
  if (!text) return '';
  
  // Escape HTML entities first
  let processed = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  if (!preserveMarkdown) {
    // If we don't need to preserve markdown, escape markdown characters
    processed = processed
      .replace(/\*/g, '\\*')  // Asterisks for bold/italic
      .replace(/_/g, '\\_')   // Underscores for bold/italic
      .replace(/`/g, '\\`')   // Backticks for code
      .replace(/~/g, '\\~')   // Tildes for strikethrough
      .replace(/\[/g, '\\[')  // Square brackets for links
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')  // Parentheses for links
      .replace(/\)/g, '\\)');
  }
  
  return processed;
}


