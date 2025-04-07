# Alai Challenge - Presentation from Webpage

The goal of the challenge is to write a script that takes in any arbitrary webpage as a URL and output a sharable link to an Alai presentation made from the content of the webpage.
As

## Notes

1. Web Scraping: Use Firecrawl API (https://www.firecrawl.dev/) to scrape the input webpage. Sign up for a free API key.

2. Presentation Creation: Create a 2-5 slide presentation using Alai endpoints. Since Alai's API is undocumented, you'll need to:

   - Create an account at www.getalai.com
   - Use Chrome's network tab to identify the required API endpoints
   - Chain these endpoints to create the presentation automatically

3. Authentication: Alai endpoints require an access token that expires every 30 mins - 2 hours. You'll need to refresh this token periodically.

4. Final Output: Your script should output a shareable Alai presentation link (Example: https://app.getalai.com/view/9W1ic45gS1Kc3iSWv4N42A)

5. Documentation: Create a 1-2 minute Loom video explaining your solution and approach.

6. Extra Credit: Improve presentation quality through:

   - Better slide creation instructions / use of scraped content etc
   - Image imports from webpages
   - Other creative improvements

7. For any questions, reach out at anmol@getalai.com

Document any extra credit work in your Loom video.# Alai-Challenge---Presentation-from-Webpage
