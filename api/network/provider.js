export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🌐 Network provider request received');
    
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