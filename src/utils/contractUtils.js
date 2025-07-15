import { ethers } from 'ethers';
import CertificateNFT from '../artifacts/contracts/CertificateNFT.sol/CertificateNFT.json';

/**
 * Get an instance of the CertificateNFT contract using ethers.js
 * @param {string} contractAddress - The deployed contract address
 * @param {object} signer - Ethers.js signer object
 * @returns {Contract} - Contract instance
 */
export const getCertificateContract = (contractAddress, signer) => {
  if (!contractAddress || !signer) {
    throw new Error('Contract address and signer are required');
  }
  return new ethers.Contract(contractAddress, CertificateNFT.abi, signer);
};

/**
 * Get an instance of the CertificateNFT contract with read-only access
 * @param {string} contractAddress - The deployed contract address
 * @param {object} provider - Ethers.js provider object
 * @returns {Contract} - Contract instance
 */
export const getCertificateContractReadOnly = (contractAddress, provider) => {
  if (!contractAddress || !provider) {
    throw new Error('Contract address and provider are required');
  }
  return new ethers.Contract(contractAddress, CertificateNFT.abi, provider);
};

/**
 * Get event details from a contract
 * @param {string} contractAddress - The deployed contract address
 * @param {object} provider - Ethers.js provider object
 * @returns {object} - Event details
 */
export const getEventDetails = async (contractAddress, provider) => {
  try {
    const contract = getCertificateContractReadOnly(contractAddress, provider);
    
    const eventName = await contract.eventName();
    const eventDescription = await contract.eventDescription();
    const eventDate = await contract.eventDate();
    const eventImageURI = await contract.eventImageURI();
    const merkleRoot = await contract.merkleRoot();
    
    return {
      eventName,
      eventDescription,
      eventDate,
      eventImageURI,
      merkleRoot
    };
  } catch (error) {
    console.error('Error getting event details:', error);
    throw error;
  }
};

/**
 * Check if an address has already claimed a certificate
 * @param {string} contractAddress - The deployed contract address
 * @param {string} address - The address to check
 * @param {object} provider - Ethers.js provider object
 * @returns {boolean} - Whether the address has claimed
 */
export const hasAddressClaimed = async (contractAddress, address, provider) => {
  try {
    const contract = getCertificateContractReadOnly(contractAddress, provider);
    return await contract.hasClaimed(address);
  } catch (error) {
    console.error('Error checking if address has claimed:', error);
    throw error;
  }
};

/**
 * Check if an address is eligible to claim a certificate
 * @param {string} contractAddress - The deployed contract address
 * @param {string} address - The address to check
 * @param {array} merkleProof - The Merkle proof for the address
 * @param {object} provider - Ethers.js provider object
 * @returns {boolean} - Whether the address is eligible
 */
export const isAddressEligible = async (contractAddress, address, merkleProof, provider) => {
  try {
    // Use the standard contract
    const contract = getCertificateContractReadOnly(contractAddress, provider);
    return await contract.isEligible(address, merkleProof);
  } catch (error) {
    console.error('Error checking if address is eligible:', error);
    throw error;
  }
};

/**
 * Claim a certificate
 * @param {string} contractAddress - The deployed contract address
 * @param {array} merkleProof - The Merkle proof for the address
 * @param {string} tokenURI - The token URI with the certificate metadata
 * @param {object} signer - Ethers.js signer object
 * @returns {object} - Transaction receipt
 */
export const claimCertificate = async (contractAddress, merkleProof, tokenURI, signer) => {
  try {
    console.log('🔍 Claiming certificate with parameters:');
    console.log('Contract address:', contractAddress);
    console.log('Merkle proof:', merkleProof);
    console.log('Token URI:', tokenURI);
    console.log('Signer address:', await signer.getAddress());

    // Use the standard contract
    const contract = getCertificateContract(contractAddress, signer);
    console.log('✅ Contract instance created successfully');

    console.log('⛽ Estimating gas...');
    const gasEstimate = await contract.estimateGas.claimCertificate(merkleProof, tokenURI);
    console.log('Gas estimate:', gasEstimate.toString());
    
    const gasLimit = gasEstimate.mul(120).div(100); // Add 20%
    console.log('Gas limit (with 20% buffer):', gasLimit.toString());

    console.log('🚀 Sending transaction...');
    const tx = await contract.claimCertificate(merkleProof, tokenURI, { gasLimit });
    console.log('Transaction sent:', tx.hash);

    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('❌ Error claiming certificate:', error);
    
    // Provide more specific error messages
    if (error.code === 4001) {
      throw new Error('Transaction was rejected by user.');
    } else if (error.message && error.message.includes('already claimed')) {
      throw new Error('You have already claimed this certificate.');
    } else if (error.message && error.message.includes('Invalid Merkle proof')) {
      throw new Error('Invalid Merkle proof. Please check your proof and try again.');
    } else if (error.message && error.message.includes('Contract address and signer are required')) {
      throw new Error('Invalid contract address or wallet connection. Please check your inputs.');
    } else {
      throw error;
    }
  }
};

/**
 * Estimate gas cost for contract deployment
 * @param {object} eventDetails - Event details
 * @param {string} merkleRoot - The Merkle root
 * @param {object} signer - Ethers.js signer object
 * @returns {object} - Gas estimation details
 */
export const estimateDeploymentCost = async (eventDetails, merkleRoot, signer) => {
  try {
    const contractFactory = new ethers.ContractFactory(
      CertificateNFT.abi,
      CertificateNFT.bytecode,
      signer
    );

    const deploymentData = contractFactory.getDeployTransaction(
      eventDetails.name || eventDetails.eventName,
      eventDetails.symbol,
      eventDetails.eventName || eventDetails.name,
      eventDetails.eventDescription,
      eventDetails.eventDate,
      eventDetails.eventImageURI,
      merkleRoot
    );

    const gasEstimate = await signer.estimateGas(deploymentData);
    const gasCostWei = gasEstimate.mul(ethers.utils.parseUnits("1", "gwei"));
    const gasCostEth = ethers.utils.formatEther(gasCostWei);
    const estimatedCostINR = Math.round(parseFloat(gasCostEth) * 200000);

    return {
      gasEstimate: gasEstimate.toString(),
      gasCostEth,
      estimatedCostINR
    };
  } catch (error) {
    console.error('Error estimating gas:', error);
    return null;
  }
};

/**
 * Deploy ultra-low gas CertificateNFT contract (~100 INR only)
 * @param {object} eventDetails - Event details
 * @param {string} merkleRoot - The Merkle root
 * @param {object} signer - Ethers.js signer object
 * @returns {object} - Deployed contract
 */
// Deploy with ultra-low gas for maximum cost savings (slower but cheaper)
export const deployCertificateContractUltraLow = async (eventDetails, merkleRoot, signer) => {
  try {
    console.log('🐌 Deploying with ultra-low gas for maximum cost savings...');
    console.log('Event details:', eventDetails);
    console.log('Merkle root:', merkleRoot);

    // Check signer and balance - handle different signer types
    let signerAddress;
    try {
      if (signer.getAddress) {
        signerAddress = await signer.getAddress();
      } else if (signer.address) {
        signerAddress = signer.address;
      } else if (signer.getAddress && typeof signer.getAddress === 'function') {
        signerAddress = await signer.getAddress();
      } else {
        throw new Error('Invalid signer object - no address method found');
      }
    } catch (error) {
      console.error('Error getting signer address:', error);
      throw new Error('Failed to get signer address. Please check your wallet connection.');
    }
    
    console.log('Signer address:', signerAddress);

    let balance;
    try {
      if (signer.getBalance) {
        balance = await signer.getBalance();
      } else if (signer.provider && signer.provider.getBalance) {
        balance = await signer.provider.getBalance(signerAddress);
      } else {
        throw new Error('Cannot get balance - no balance method found');
      }
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get account balance. Please check your wallet connection.');
    }
    
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');

    if (balance.isZero()) {
      throw new Error('Insufficient balance. You need Sepolia ETH to deploy the contract.');
    }

    const contractFactory = new ethers.ContractFactory(
      CertificateNFT.abi,
      CertificateNFT.bytecode,
      signer
    );

    const { name, symbol, eventName, eventDescription, eventDate, eventImageURI } = eventDetails;

    // Use very low gas price for maximum savings
    const ultraLowGasPrice = ethers.utils.parseUnits("1", "gwei");

    const deploymentData = contractFactory.getDeployTransaction(
      name, symbol, eventName, eventDescription, eventDate, eventImageURI, merkleRoot
    );
    const gasEstimate = await signer.estimateGas(deploymentData);

    const gasCostWei = gasEstimate.mul(ultraLowGasPrice);
    const gasCostEth = ethers.utils.formatEther(gasCostWei);
    const estimatedCostINR = Math.round(parseFloat(gasCostEth) * 200000);

    console.log(`Ultra-low gas deployment cost: ${gasCostEth} ETH (~${estimatedCostINR} INR)`);
    console.log('⚠️ This may take 5-15 minutes but will be very cheap!');

    const contract = await contractFactory.deploy(
      name, symbol, eventName, eventDescription, eventDate, eventImageURI, merkleRoot,
      {
        gasLimit: gasEstimate.mul(105).div(100),
        gasPrice: ultraLowGasPrice,
      }
    );

    console.log('Ultra-low gas deployment transaction sent:', contract.deployTransaction.hash);
    console.log('⏳ Waiting for ultra-low gas deployment (may take 5-15 minutes)...');
    console.log('🔗 Track progress: https://sepolia.etherscan.io/tx/' + contract.deployTransaction.hash);

    // Wait for deployment with longer timeout for ultra-low gas
    const deploymentPromise = contract.deployed();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Ultra-low gas deployment timeout after 20 minutes. Check Etherscan for transaction status.')), 1200000)
    );

    // Add progress logging for ultra-low gas (longer intervals)
    const progressInterval = setInterval(() => {
      console.log('⏳ Still waiting for ultra-low gas deployment (this is normal)...');
    }, 30000); // Log every 30 seconds

    try {
      await Promise.race([deploymentPromise, timeoutPromise]);
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }

    console.log('Ultra-low gas contract deployed successfully at:', contract.address);
    return {
      address: contract.address,
      deployTransaction: {
        hash: contract.deployTransaction.hash,
        gasLimit: contract.deployTransaction.gasLimit?.toString(),
        gasPrice: contract.deployTransaction.gasPrice?.toString()
      }
    };

  } catch (error) {
    console.error('Ultra-low gas deployment failed:', error);
    throw error;
  }
};

export const deployCertificateContractOptimized = async (eventDetails, merkleRoot, signer) => {
  try {
    console.log('Starting gas-optimized contract deployment...');
    console.log('Event details:', eventDetails);
    console.log('Merkle root:', merkleRoot);

    // Check signer - handle different signer types
    let signerAddress;
    try {
      if (signer.getAddress) {
        signerAddress = await signer.getAddress();
      } else if (signer.address) {
        signerAddress = signer.address;
      } else if (signer.getAddress && typeof signer.getAddress === 'function') {
        signerAddress = await signer.getAddress();
      } else {
        throw new Error('Invalid signer object - no address method found');
      }
    } catch (error) {
      console.error('Error getting signer address:', error);
      throw new Error('Failed to get signer address. Please check your wallet connection.');
    }
    
    console.log('Signer address:', signerAddress);

    // Check network
    const network = await signer.provider.getNetwork();
    console.log('Network:', network.name, 'Chain ID:', network.chainId);

    // Check balance
    const balance = await signer.getBalance();
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');

    if (balance.isZero()) {
      throw new Error('Insufficient balance. You need Sepolia ETH to deploy the contract.');
    }

    // Create contract factory using the optimized CertificateNFT
    const contractFactory = new ethers.ContractFactory(
      CertificateNFT.abi,
      CertificateNFT.bytecode,
      signer
    );

    console.log('Contract factory created');

    // Prepare constructor arguments (same as original for compatibility)
    const name = eventDetails.name || eventDetails.eventName;
    const symbol = eventDetails.symbol;
    const eventName = eventDetails.eventName || eventDetails.name;
    const eventDescription = eventDetails.eventDescription;
    const eventDate = eventDetails.eventDate;
    const eventImageURI = eventDetails.eventImageURI;

    console.log('Constructor arguments:', {
      name,
      symbol,
      eventName,
      eventDescription,
      eventDate,
      eventImageURI,
      merkleRoot
    });

    // Get current network gas price
    const currentGasPrice = await signer.provider.getGasPrice();
    console.log('Current network gas price:', ethers.utils.formatUnits(currentGasPrice, 'gwei'), 'gwei');

    // Optimized gas pricing for ~100 INR cost and fast deployment
    const currentGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));

    let deployGasPrice;
    if (currentGwei < 1.5) {
      // Network is very quiet - use 1.5 gwei for fast confirmation
      deployGasPrice = ethers.utils.parseUnits("1.5", "gwei");
    } else if (currentGwei < 3) {
      // Normal conditions - add small premium (10-20%)
      deployGasPrice = currentGasPrice.mul(110).div(100);
    } else {
      // Higher congestion - cap at 3 gwei to control costs
      deployGasPrice = ethers.utils.parseUnits("3", "gwei");
    }

    const finalGwei = parseFloat(ethers.utils.formatUnits(deployGasPrice, 'gwei'));
    console.log(`Using gas price: ${finalGwei.toFixed(2)} gwei (optimized for ~100 INR cost)`);

    // Estimate gas
    const deploymentData = contractFactory.getDeployTransaction(
      name,
      symbol,
      eventName,
      eventDescription,
      eventDate,
      eventImageURI,
      merkleRoot
    );

    const gasEstimate = await signer.estimateGas(deploymentData);
    console.log('Estimated gas:', gasEstimate.toString());

    // Calculate estimated cost
    const gasCostWei = gasEstimate.mul(deployGasPrice);
    const gasCostEth = ethers.utils.formatEther(gasCostWei);
    const estimatedCostINR = Math.round(parseFloat(gasCostEth) * 200000); // Rough ETH to INR conversion
    console.log(`Estimated deployment cost: ${gasCostEth} ETH (~${estimatedCostINR} INR)`);

    // Warn if cost is too high
    if (estimatedCostINR > 200) {
      console.warn(`⚠️ High deployment cost detected (${estimatedCostINR} INR). Consider waiting for lower gas prices.`);
    } else {
      console.log(`✅ Deployment cost is reasonable (${estimatedCostINR} INR)`);
    }

    // Deploy with cost-optimized gas settings
    const contract = await contractFactory.deploy(
      name,
      symbol,
      eventName,
      eventDescription,
      eventDate,
      eventImageURI,
      merkleRoot,
      {
        gasLimit: gasEstimate.mul(105).div(100), // Minimal 5% buffer to save gas
        gasPrice: deployGasPrice, // Cost-optimized gas price
      }
    );

    console.log('Contract deployment transaction sent:', contract.deployTransaction.hash);
    console.log('⏳ Waiting for deployment confirmation...');
    console.log('🔗 Track progress: https://sepolia.etherscan.io/tx/' + contract.deployTransaction.hash);

    // Wait for deployment with timeout and progress updates
    const deploymentPromise = contract.deployed();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Deployment timeout after 2 minutes. Check Etherscan for transaction status.')), 120000)
    );

    // Add progress logging
    const progressInterval = setInterval(() => {
      console.log('⏳ Still waiting for deployment confirmation...');
    }, 15000); // Log every 15 seconds

    try {
      await Promise.race([deploymentPromise, timeoutPromise]);
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }

    console.log('Gas-optimized contract deployed successfully at:', contract.address);
    return {
      address: contract.address,
      deployTransaction: {
        hash: contract.deployTransaction.hash,
        gasLimit: contract.deployTransaction.gasLimit?.toString(),
        gasPrice: contract.deployTransaction.gasPrice?.toString()
      }
    };

  } catch (error) {
    console.error('Error deploying gas-optimized contract:', error);

    // Provide more specific error messages
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds. You need more Sepolia ETH to deploy the contract.');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your internet connection and try again.');
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error('Gas estimation failed. The transaction may fail or require manual gas limit.');
    } else if (error.message && error.message.includes('user rejected')) {
      throw new Error('Transaction was rejected by user.');
    } else {
      throw error;
    }
  }
};

/**
 * Deploy a new CertificateNFT contract (original version)
 * @param {object} eventDetails - Event details
 * @param {string} merkleRoot - The Merkle root
 * @param {object} signer - Ethers.js signer object
 * @returns {object} - Deployed contract
 */
export const deployCertificateContract = async (eventDetails, merkleRoot, signer) => {
  try {
    console.log('Starting contract deployment...');
    console.log('Event details:', eventDetails);
    console.log('Merkle root:', merkleRoot);

    // Check signer
    const signerAddress = await signer.getAddress();
    console.log('Signer address:', signerAddress);

    // Check network
    const network = await signer.provider.getNetwork();
    console.log('Network:', network.name, 'Chain ID:', network.chainId);

    // Check balance
    const balance = await signer.getBalance();
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');

    if (balance.isZero()) {
      throw new Error('Insufficient balance. You need Sepolia ETH to deploy the contract.');
    }

    console.log('Creating contract factory...');
    const ContractFactory = new ethers.ContractFactory(
      CertificateNFT.abi,
      CertificateNFT.bytecode,
      signer
    );

    console.log('Estimating gas...');
    const deploymentData = ContractFactory.getDeployTransaction(
      eventDetails.name,
      eventDetails.symbol,
      eventDetails.eventName,
      eventDetails.eventDescription,
      eventDetails.eventDate,
      eventDetails.eventImageURI,
      merkleRoot
    );

    const gasEstimate = await signer.estimateGas(deploymentData);
    console.log('Estimated gas:', gasEstimate.toString());

    console.log('Deploying contract...');
    const contract = await ContractFactory.deploy(
      eventDetails.name,
      eventDetails.symbol,
      eventDetails.eventName,
      eventDetails.eventDescription,
      eventDetails.eventDate,
      eventDetails.eventImageURI,
      merkleRoot
    );

    console.log('Contract deployed, waiting for confirmation...');
    console.log('Transaction hash:', contract.deployTransaction.hash);

    await contract.deployed();
    console.log('Contract deployed successfully at:', contract.address);

    return {
      address: contract.address,
      deployTransaction: {
        hash: contract.deployTransaction.hash,
        gasLimit: contract.deployTransaction.gasLimit?.toString(),
        gasPrice: contract.deployTransaction.gasPrice?.toString()
      }
    };
  } catch (error) {
    console.error('Error deploying certificate contract:', error);

    // Provide more specific error messages
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds. You need more Sepolia ETH to deploy the contract.');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your internet connection and try again.');
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error('Gas estimation failed. The transaction may fail or require manual gas limit.');
    } else if (error.message && error.message.includes('user rejected')) {
      throw new Error('Transaction was rejected by user.');
    } else {
      throw error;
    }
  }
};

/**
 * Update the Merkle root in the contract
 * @param {string} contractAddress - The deployed contract address
 * @param {string} merkleRoot - The new Merkle root
 * @param {object} signer - Ethers.js signer object
 * @returns {object} - Transaction receipt
 */
export const updateMerkleRoot = async (contractAddress, merkleRoot, signer) => {
  try {
    const contract = getCertificateContract(contractAddress, signer);
    const tx = await contract.updateMerkleRoot(merkleRoot);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error updating Merkle root:', error);
    throw error;
  }
};

/**
 * Update event details in the contract
 * @param {string} contractAddress - The deployed contract address
 * @param {object} eventDetails - The updated event details
 * @param {object} signer - Ethers.js signer object
 * @returns {object} - Transaction receipt
 */
export const updateEventDetails = async (contractAddress, eventDetails, signer) => {
  try {
    const contract = getCertificateContract(contractAddress, signer);
    const tx = await contract.updateEventDetails(
      eventDetails.eventName,
      eventDetails.eventDescription,
      eventDetails.eventDate,
      eventDetails.eventImageURI
    );
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error updating event details:', error);
    throw error;
  }
}; 