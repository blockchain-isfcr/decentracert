export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    environment: {
      pinataJwt: process.env.PINATA_JWT ? 'Present' : 'Missing',
      etherscanApiKey: process.env.ETHERSCAN_API_KEY ? 'Present' : 'Missing',
      sepoliaApiUrl: process.env.SEPOLIA_API_URL ? 'Present' : 'Missing'
    }
  });
} 