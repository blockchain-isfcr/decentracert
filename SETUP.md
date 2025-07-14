# Secure Setup Guide

## Overview
This project now uses a secure Express backend to handle sensitive API calls, keeping your secrets server-side and never exposing them to the client.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Your private key for deployment
PRIVATE_KEY=your_actual_private_key_here

# Infura or Alchemy API key for Sepolia testnet
SEPOLIA_API_URL=https://sepolia.infura.io/v3/your_actual_infura_key

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_actual_etherscan_key

# Pinata API Keys for IPFS storage
PINATA_API_KEY=your_actual_pinata_key
PINATA_API_SECRET=your_actual_pinata_secret
PINATA_JWT=your_actual_pinata_jwt
```

### 3. Build the React App
```bash
npm run build
```

### 4. Start the Server
```bash
npm run server
```

The server will run on `http://localhost:3001` and serve both the API endpoints and the React app.

### 5. Development Mode (Optional)
For development with hot reloading:
```bash
npm run dev
```

This runs both the Express server and React development server concurrently.

## Security Benefits

✅ **No secrets in client bundle** - All API keys stay server-side  
✅ **Secure IPFS uploads** - Pinata JWT never exposed to browser  
✅ **Protected Etherscan calls** - API key handled server-side  
✅ **Environment-based config** - Easy to manage different environments  

## API Endpoints

- `POST /api/upload-ipfs` - Upload files to IPFS
- `POST /api/upload-metadata` - Upload metadata to IPFS  
- `GET /api/etherscan/:endpoint` - Proxy Etherscan API calls
- `POST /api/network/provider` - Get network RPC URLs

## Troubleshooting

- Make sure all environment variables are set correctly
- Check that the React app is built (`npm run build`)
- Verify the server is running on port 3001
- Check browser console for any API errors 