export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🌐 Network provider request received');
  
  try {
    const { network } = req.body;
    
    if (network === 'sepolia') {
      res.json({ 
        rpcUrl: process.env.SEPOLIA_API_URL || 'https://sepolia.infura.io/v3/'
      });
    } else {
      res.status(400).json({ error: 'Unsupported network' });
    }
  } catch (error) {
    console.error('❌ Error getting network provider:', error.message);
    res.status(500).json({ error: 'Failed to get network provider' });
  }
} 