import { ethers } from 'ethers';

/**
 * Enhanced MetaMask integration utilities for soulbound certificates
 * Provides multiple methods to make certificates visible in MetaMask
 */

/**
 * Add soulbound certificate to MetaMask NFT collection
 * Uses multiple fallback methods for maximum compatibility
 */
export const addSoulboundCertificateToMetaMask = async (certificate) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  console.log('🦊 Adding soulbound certificate to MetaMask:', certificate);

  // Method 1: Standard ERC721 addition (works with updated contract)
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC721',
        options: {
          address: certificate.contractAddress,
          tokenId: certificate.tokenId.toString(),
        },
      },
    });

    if (wasAdded) {
      return {
        success: true,
        method: 'ERC721',
        message: '🎉 Soulbound Certificate added to MetaMask NFT collection!\n\n' +
                '✅ Your certificate is now visible in MetaMask\n' +
                '🔒 It remains non-transferable (soulbound)\n' +
                '📱 Check the "NFTs" tab in MetaMask'
      };
    }
  } catch (erc721Error) {
    console.log('ERC721 method failed, trying alternatives...', erc721Error);
  }

  // Method 2: Add as custom token for monitoring
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: certificate.contractAddress,
          symbol: `SBT-${certificate.tokenId}`,
          decimals: 0,
          image: generateSoulboundTokenIcon(),
        },
      },
    });

    if (wasAdded) {
      return {
        success: true,
        method: 'ERC20',
        message: '🔗 Soulbound Certificate added as monitoring token!\n\n' +
                '✅ You can now monitor this contract in MetaMask\n' +
                '🔒 Certificate remains soulbound to your wallet\n' +
                '📱 Check your tokens list in MetaMask'
      };
    }
  } catch (tokenError) {
    console.log('Token method also failed...', tokenError);
  }

  // Method 3: Return manual instructions
  return {
    success: false,
    method: 'manual',
    message: `🔗 SOULBOUND CERTIFICATE DETECTED\n\n` +
            `MetaMask doesn't fully support soulbound NFTs yet, but your certificate is valid!\n\n` +
            `📋 Contract Address: ${certificate.contractAddress}\n` +
            `🆔 Token ID: ${certificate.tokenId}\n\n` +
            `🔍 Manual Verification:\n` +
            `1. Visit: https://sepolia.etherscan.io/address/${certificate.contractAddress}\n` +
            `2. Click "Contract" → "Read Contract"\n` +
            `3. Use "ownerOf" with your token ID\n` +
            `4. Verify it returns your wallet address\n\n` +
            `💡 Your certificate is permanently bound to your wallet!`
  };
};

/**
 * Automatically add certificate to MetaMask after claiming
 */
export const autoAddCertificateToMetaMask = async (contractAddress, account, provider, eventDetails) => {
  try {
    // Get certificate details from contract
    const contract = new ethers.Contract(contractAddress, [
      "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
      "function name() view returns (string)",
      "function symbol() view returns (string)"
    ], provider);
    
    const [exists, tokenId, uri] = await contract.getSoulboundCertificateDetails(account);
    
    if (!exists) {
      throw new Error('Certificate not found for this address');
    }

    const [contractName, contractSymbol] = await Promise.all([
      contract.name(),
      contract.symbol()
    ]);

    const certificate = {
      contractAddress: contractAddress,
      tokenId: tokenId.toString(),
      contractName: contractName,
      contractSymbol: contractSymbol,
      uri: uri
    };

    // Show confirmation dialog
    const userWantsToAdd = confirm(
      '🎉 Certificate claimed successfully!\n\n' +
      '✅ Your soulbound certificate is now permanently bound to your wallet\n' +
      '🔒 It cannot be transferred or sold (this is by design)\n\n' +
      'Would you like to add it to your MetaMask for easy viewing?'
    );

    if (userWantsToAdd) {
      const result = await addSoulboundCertificateToMetaMask(certificate);
      alert(result.message);
      return result;
    }

    return { success: true, method: 'skipped', message: 'User chose not to add to MetaMask' };

  } catch (error) {
    console.error('Auto-add to MetaMask failed:', error);
    return { success: false, method: 'error', message: error.message };
  }
};

/**
 * Verify certificate ownership in MetaMask
 */
export const verifyCertificateInMetaMask = async (certificate, account) => {
  try {
    // Ensure we're on Sepolia network
    await switchToSepoliaNetwork();

    // Create contract instance
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(certificate.contractAddress, [
      "function ownerOf(uint256) view returns (address)",
      "function hasSoulboundCertificate(address) view returns (bool)",
      "function tokenURI(uint256) view returns (string)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function totalSupply() view returns (uint256)"
    ], provider);

    // Verify ownership and get details
    const [owner, hasCertificate, tokenURI, contractName, contractSymbol, totalSupply] = await Promise.all([
      contract.ownerOf(certificate.tokenId),
      contract.hasSoulboundCertificate(account),
      contract.tokenURI(certificate.tokenId),
      contract.name(),
      contract.symbol(),
      contract.totalSupply()
    ]);

    const isOwner = owner.toLowerCase() === account.toLowerCase();
    
    return {
      success: true,
      isOwner,
      hasCertificate,
      contractName,
      contractSymbol,
      totalSupply: totalSupply.toString(),
      tokenURI,
      owner,
      etherscanUrl: `https://sepolia.etherscan.io/address/${certificate.contractAddress}`,
      tokenUrl: `https://sepolia.etherscan.io/token/${certificate.contractAddress}?a=${certificate.tokenId}`
    };

  } catch (error) {
    console.error('Certificate verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Switch MetaMask to Sepolia network
 */
export const switchToSepoliaNetwork = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
    });
  } catch (switchError) {
    // If network doesn't exist, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Testnet',
          nativeCurrency: {
            name: 'Sepolia ETH',
            symbol: 'SEP',
            decimals: 18,
          },
          rpcUrls: ['https://sepolia.infura.io/v3/'],
          blockExplorerUrls: ['https://sepolia.etherscan.io/'],
        }],
      });
    } else {
      throw switchError;
    }
  }
};

/**
 * Generate a base64 SVG icon for soulbound tokens
 */
export const generateSoulboundTokenIcon = () => {
  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="8" fill="#007BFF"/>
      <text x="32" y="38" font-family="Arial" font-size="24" font-weight="bold" fill="white" text-anchor="middle">🏆</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Add contract to MetaMask for monitoring
 */
export const addContractToMetaMask = async (contractAddress, contractName, contractSymbol) => {
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: contractAddress,
          symbol: contractSymbol,
          decimals: 0,
          image: generateSoulboundTokenIcon(),
        },
      },
    });

    return {
      success: wasAdded,
      message: wasAdded 
        ? '🔗 Contract added to MetaMask for monitoring!'
        : 'Contract addition was cancelled'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error adding contract: ${error.message}`
    };
  }
};
