const axios = require('axios');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔍 Etherscan request:', req.query.endpoint);
  
  try {
    const { endpoint } = req.query;
    const params = { ...req.query };
    delete params.endpoint; // Remove endpoint from params
    
    if (!process.env.ETHERSCAN_API_KEY) {
      return res.status(500).json({ error: 'Etherscan API key not configured' });
    }
    
    // Add API key to params
    params.apikey = process.env.ETHERSCAN_API_KEY;

    const response = await axios.get(
      `https://api-sepolia.etherscan.io/api?module=${endpoint}`,
      { 
        params,
        timeout: 10000 // 10 second timeout
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching Etherscan data:', error.message);
    res.status(500).json({ error: 'Failed to fetch Etherscan data' });
  }
} 