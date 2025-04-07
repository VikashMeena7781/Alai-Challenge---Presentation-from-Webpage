import axios from 'axios';

// Supabase anon key used for initial authentication
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzY2hvdHRoamdsamJ4amVyY3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAxMTI0NzYsImV4cCI6MjAyNTY4ODQ3Nn0.3pZ7fQ9qWjBcX-oSLJ37P4D9ojrdTF1zdI1B4ONcxrE';

export async function authenticate(): Promise<string> {
  try {
    console.log('Authenticating with Alai...');

    // Check if credentials are provided
    if (!process.env.ALAI_EMAIL || !process.env.ALAI_PASSWORD) {
      throw new Error('ALAI_EMAIL and ALAI_PASSWORD must be provided in environment variables');
    }

    // Make authentication request with correct endpoint and headers
    const response = await axios.post(
      'https://api.getalai.com/auth/v1/token?grant_type=password',
      {
        email: process.env.ALAI_EMAIL,
        password: process.env.ALAI_PASSWORD,
        gotrue_meta_security: {}
      },
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY, 
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract access token from response
    const accessToken = response.data.access_token;
    
    if (!accessToken) {
      throw new Error('Authentication failed: No access token received');
    }
    
    console.log('Authentication successful');
    return accessToken;
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    
    throw new Error('Failed to authenticate with Alai');
  }
}