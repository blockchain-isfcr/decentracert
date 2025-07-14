const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// API Routes - these must come BEFORE static file serving
app.post('/api/upload-ipfs', upload.single('file'), async (req, res) => {
  console.log('📤 IPFS upload request received');
  try {
    const file = req.file;
    const metadata = JSON.parse(req.body.metadata || '{}');

    if (!file) {
      console.log('❌ No file provided');
      return res.status(400).json({ error: 'No file provided' });
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
        headers: {
          'Authorization': `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders(),
        },
      }
    );

    console.log('✅ IPFS upload successful:', response.data.IpfsHash);
    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error('❌ Error uploading to IPFS:', error.message);
    res.status(500).json({ error: `Failed to upload to IPFS: ${error.message}` });
  }
});

app.post('/api/upload-metadata', async (req, res) => {
  console.log('📤 Metadata upload request received');
  try {
    const metadata = req.body;

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
      }
    );

    console.log('✅ Metadata upload successful:', response.data.IpfsHash);
    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error('❌ Error uploading metadata to IPFS:', error.message);
    res.status(500).json({ error: `Failed to upload metadata to IPFS: ${error.message}` });
  }
});

app.get('/api/etherscan/:endpoint', async (req, res) => {
  console.log('🔍 Etherscan request:', req.params.endpoint);
  try {
    const { endpoint } = req.params;
    const params = req.query;
    
    // Add API key to params
    params.apikey = process.env.ETHERSCAN_API_KEY;

    const response = await axios.get(
      `https://api-sepolia.etherscan.io/api?module=${endpoint}`,
      { params }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching Etherscan data:', error.message);
    res.status(500).json({ error: 'Failed to fetch Etherscan data' });
  }
});

app.post('/api/network/provider', async (req, res) => {
  console.log('🌐 Network provider request received');
  try {
    const { network } = req.body;
    
    if (network === 'sepolia') {
      res.json({ 
        rpcUrl: process.env.SEPOLIA_API_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY'
      });
    } else {
      res.status(400).json({ error: 'Unsupported network' });
    }
  } catch (error) {
    console.error('❌ Error getting network provider:', error.message);
    res.status(500).json({ error: 'Failed to get network provider' });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes - this must come LAST
app.use(express.static('build'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 App available at http://localhost:${PORT}`);
  console.log(`🔐 PINATA_JWT: ${process.env.PINATA_JWT ? 'Present' : 'Missing'}`);
  console.log(`🔑 ETHERSCAN_API_KEY: ${process.env.ETHERSCAN_API_KEY ? 'Present' : 'Missing'}`);
}); 