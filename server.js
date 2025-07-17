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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Retry function for IPFS uploads
const retryUpload = async (uploadFunction, maxRetries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} to upload to IPFS...`);
      return await uploadFunction();
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log(`⏳ Retrying in ${delay}ms...`);
    }
  }
};

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

    // Upload function with retry logic
    const uploadToPinata = async () => {
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
          timeout: 60000, // 60 second timeout
        }
      );

      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata API');
      }

      return response;
    };

    // Attempt upload with retries
    const response = await retryUpload(uploadToPinata);

    console.log('✅ IPFS upload successful:', response.data.IpfsHash);
    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error('❌ Error uploading to IPFS:', error.message);
    console.error('❌ Error details:', error.response?.data || error.stack);
    
    let errorMessage = 'Failed to upload to IPFS';
    
    if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
      errorMessage = 'Network connection issue with IPFS service. Please try again in a few minutes.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Pinata authentication failed. Please check your JWT token.';
    } else if (error.response?.status === 413) {
      errorMessage = 'File too large. Please use a smaller file.';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = 'Upload timed out. Please try again.';
    } else {
      errorMessage = `Upload failed: ${error.message}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/upload-metadata', async (req, res) => {
  console.log('📤 Metadata upload request received');
  try {
    const metadata = req.body;

    if (!process.env.PINATA_JWT) {
      console.log('❌ PINATA_JWT not configured');
      return res.status(500).json({ error: 'Pinata JWT not configured on server' });
    }

    console.log('🔐 Using PINATA_JWT:', process.env.PINATA_JWT ? 'Present' : 'Missing');

    // Upload function with retry logic
    const uploadMetadataToPinata = async () => {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        metadata,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PINATA_JWT}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata API');
      }

      return response;
    };

    // Attempt upload with retries
    const response = await retryUpload(uploadMetadataToPinata);

    console.log('✅ Metadata upload successful:', response.data.IpfsHash);
    res.json({ ipfsHash: response.data.IpfsHash });
  } catch (error) {
    console.error('❌ Error uploading metadata to IPFS:', error.message);
    console.error('❌ Error details:', error.response?.data || error.stack);
    
    let errorMessage = 'Failed to upload metadata to IPFS';
    
    if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
      errorMessage = 'Network connection issue with IPFS service. Please try again in a few minutes.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Pinata authentication failed. Please check your JWT token.';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = 'Upload timed out. Please try again.';
    } else {
      errorMessage = `Upload failed: ${error.message}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/etherscan/:endpoint', async (req, res) => {
  console.log('🔍 Etherscan request:', req.params.endpoint);
  try {
    const { endpoint } = req.params;
    const params = req.query;
    
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
});

app.post('/api/network/provider', async (req, res) => {
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
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes - this must come LAST
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Single app.listen() call at the end
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 App available at http://localhost:${PORT}`);
  console.log(`🔐 PINATA_JWT: ${process.env.PINATA_JWT ? 'Present' : 'Missing'}`);
  console.log(`🔑 ETHERSCAN_API_KEY: ${process.env.ETHERSCAN_API_KEY ? 'Present' : 'Missing'}`);
}); 