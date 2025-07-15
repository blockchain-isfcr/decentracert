# Blockchain Certificate System

A decentralized certificate system using soulbound NFTs on Ethereum Sepolia testnet.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required for Backend (server.js)
```
PINATA_JWT=your_pinata_jwt_token
ETHERSCAN_API_KEY=your_etherscan_api_key
SEPOLIA_API_URL=https://sepolia.infura.io/v3/your_infura_project_id
PORT=3001
```

### Required for Frontend
```
REACT_APP_DEPLOYED_CONTRACT_ADDRESS=your_deployed_contract_address
REACT_APP_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id
```

### Required for Hardhat (deployment)
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id
PRIVATE_KEY=your_deployment_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/blockchain-isfcr/decentracert
   cd decentracert
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