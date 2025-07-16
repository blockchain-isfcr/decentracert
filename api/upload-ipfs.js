import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📤 IPFS upload request received');
    
    const { fileData, fileName, fileType, metadata } = req.body;

    if (!fileData) {
      console.log('❌ No file data provided');
      return res.status(400).json({ error: 'No file data provided' });
    }

    if (!process.env.PINATA_JWT) {
      console.log('❌ PINATA_JWT not configured');
      return res.status(500).json({ error: 'Pinata JWT not configured on server' });
    }

    console.log('📁 File received:', fileName, 'Type:', fileType);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Create form data for Pinata
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName || 'certificate-image',
      contentType: fileType || 'image/png',
    });

    const pinataMetadata = JSON.stringify({
      name: metadata?.name || 'certificate-image',
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

// Configure the API route to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}; 