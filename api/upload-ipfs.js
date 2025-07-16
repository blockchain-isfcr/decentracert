const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Configure multer for Vercel serverless environment
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to handle multer in serverless environment
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

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

  console.log('📤 IPFS upload request received');
  
  try {
    // Process the file upload
    await runMiddleware(req, res, upload.single('file'));
    
    const file = req.file;
    const metadata = JSON.parse(req.body.metadata || '{}');

    if (!file) {
      console.log('❌ No file provided');
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!process.env.PINATA_JWT) {
      console.log('❌ PINATA_JWT not configured');
      return res.status(500).json({ error: 'Pinata JWT not configured on server' });
    }

    console.log('📁 File received:', file.originalname, 'Size:', file.size);

    // Create form data for Pinata
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const pinataMetadata = JSON.stringify({
      name: metadata.name || 'certificate-image',
    });
    formData.append('pinataMetadata', pinataMetadata);

    console.log('🔐 Using PINATA_JWT:', process.env.PINATA_JWT ? 'Present' : 'Missing');

    // Upload to Pinata using server-side secrets
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        maxContentLength: 'Infinity',
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (!response.data || !response.data.IpfsHash) {
      throw new Error('Invalid response from Pinata API');
    }

    console.log('✅ IPFS upload successful:', response.data.IpfsHash);
    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error('❌ Error uploading to IPFS:', error.message);
    console.error('❌ Error details:', error.response?.data || error.stack);
    
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Pinata authentication failed. Please check your JWT token.' });
    } else if (error.response?.status === 413) {
      res.status(413).json({ error: 'File too large. Please use a smaller file.' });
    } else {
      res.status(500).json({ error: `Failed to upload to IPFS: ${error.message}` });
    }
  }
} 