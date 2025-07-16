const axios = require('axios');

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

  console.log('📤 Metadata upload request received');
  
  try {
    const metadata = req.body;

    if (!process.env.PINATA_JWT) {
      console.log('❌ PINATA_JWT not configured');
      return res.status(500).json({ error: 'Pinata JWT not configured on server' });
    }

    console.log('🔐 Using PINATA_JWT:', process.env.PINATA_JWT ? 'Present' : 'Missing');

    // Upload metadata to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (!response.data || !response.data.IpfsHash) {
      throw new Error('Invalid response from Pinata API');
    }

    console.log('✅ Metadata upload successful:', response.data.IpfsHash);
    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error('❌ Error uploading metadata to IPFS:', error.message);
    console.error('❌ Error details:', error.response?.data || error.stack);
    
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Pinata authentication failed. Please check your JWT token.' });
    } else {
      res.status(500).json({ error: `Failed to upload metadata to IPFS: ${error.message}` });
    }
  }
} 