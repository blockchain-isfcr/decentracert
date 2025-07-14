# Certificate NFT System for University Clubs & Events

A fully decentralized Proof of Attendance (PoA) system using NFTs and a Merkle Tree-based whitelist, allowing university event organizers to issue verifiable digital credentials for participants.

## Overview

This project implements a complete system where:

- Event organizers can create and deploy attendance NFTs for their events
- Students can claim these NFTs by proving their eligibility via Merkle proof
- All certificates are stored on-chain as NFTs on the Ethereum Sepolia testnet

## Tech Stack

- **Frontend**: React for students and organizers
- **Smart Contract**: Solidity for minting NFTs and verifying Merkle proofs
- **Blockchain Network**: Ethereum Sepolia Testnet for on-chain deployment and NFT minting
- **Wallet Integration**: MetaMask for signing and submitting transactions
- **Metadata Storage**: IPFS / Pinata for storing badge metadata (name, description, image)
- **Web3 Library**: ethers.js for smart contract interaction from frontend
- **Security Layer**: Merkle Tree for validating student eligibility for NFT claims

## Features

### Organizer Portal
- Collect wallet addresses of registered/attending students
- Upload badge metadata (image, name, description) to IPFS
- Generate Merkle Tree from the wallet list
- Deploy or update smart contract with the Merkle root

### Student Portal
- Connect MetaMask wallet
- Check eligibility using Merkle proof verification
- Claim NFT certificate on-chain if eligible

## Setup and Installation

### Prerequisites

1. Node.js and npm installed
2. MetaMask extension installed in your browser
3. Sepolia testnet ETH in your wallet (get from a faucet)
4. Pinata account for IPFS storage

### Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd certificate-nft-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your credentials:
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
   PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
   ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
   PINATA_API_KEY=YOUR_PINATA_API_KEY
   PINATA_API_SECRET=YOUR_PINATA_API_SECRET
   PINATA_JWT=YOUR_PINATA_JWT
   ```

4. Compile the smart contracts:
   ```
   npx hardhat compile
   ```

5. Start the frontend:
   ```
   npm start
   ```

### Deploying the Contract

You can deploy the contract either through the Organizer Portal in the web interface or using Hardhat:

```
npm run deploy
```

## Workflow

### For Organizers

1. Go to the Organizer Portal
2. Enter event details and list of participant wallet addresses
3. Generate Merkle tree and download proofs
4. Upload certificate image to IPFS
5. Deploy the smart contract with the Merkle root
6. Share contract address and Merkle proofs with participants

### For Students

1. Go to the Student Portal
2. Connect your MetaMask wallet
3. Enter the contract address and your Merkle proof
4. If eligible, claim your certificate NFT

## Smart Contract

The smart contract is deployed on the Ethereum Sepolia testnet and can be interacted with directly or through the provided frontend. The contract implements:

- ERC721 NFT standard
- Merkle proof verification for whitelisting
- Certificate claiming functionality
- Ownership management

## Development

To run tests:
```
npx hardhat test
```

To deploy to Sepolia testnet:
```
npx hardhat run scripts/deploy.js --network sepolia
```

## License

MIT

## Contact

For questions or support, please open an issue in the repository. 