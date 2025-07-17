import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Award, Wallet, Search, Download, Share2, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';

const MyCertificatesDashboard = ({ account, provider, connectWallet }) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.05, 
      y: -2,
      boxShadow: "0 8px 25px rgba(139, 92, 246, 0.4)"
    },
    tap: { scale: 0.95 }
  };

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [knownContracts, setKnownContracts] = useState([]);
  const [customContract, setCustomContract] = useState('');
  const [discoveryStatus, setDiscoveryStatus] = useState('');

  // Contract ABI for soulbound certificates
  const contractABI = [
    "function hasSoulboundCertificate(address) view returns (bool)",
    "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
    "function soulboundOwnerOf(uint256) view returns (address)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
  ];

  // Load known contracts from localStorage and add defaults
  useEffect(() => {
    const saved = localStorage.getItem('knownCertificateContracts');
    let contracts = [];

    if (saved) {
      contracts = JSON.parse(saved);
    }

    // Add any default/common certificate contracts here
    // Default contract addresses - should be moved to environment variables
    const defaultContracts = [
      { address: process.env.DEFAULT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000', name: 'ISFCR Soulbound Certificate' },
    ];

    // Merge with saved contracts (avoid duplicates)
    defaultContracts.forEach(defaultContract => {
      if (!contracts.find(c => c.address.toLowerCase() === defaultContract.address.toLowerCase())) {
        contracts.push(defaultContract);
      }
    });

    setKnownContracts(contracts);

    // Save updated list
    if (contracts.length > 0) {
      localStorage.setItem('knownCertificateContracts', JSON.stringify(contracts));
    }
  }, []);

  // Auto-scan for certificates when wallet connects
  useEffect(() => {
    if (account && provider) {
      scanForCertificates();
    }
  }, [account, provider]);

  const addKnownContract = (contractAddress, name) => {
    const newContract = { address: contractAddress, name: name || 'Unknown Certificate' };
    const updated = [...knownContracts.filter(c => c.address !== contractAddress), newContract];
    setKnownContracts(updated);
    localStorage.setItem('knownCertificateContracts', JSON.stringify(updated));
  };

  const scanForCertificates = async () => {
    if (!account || !provider) return;

    setLoading(true);
    setError('');
    setCertificates([]);
    setDiscoveryStatus('🔍 Scanning blockchain for your certificates...');

    try {
      const foundCertificates = [];

      // Method 1: Check all contracts from transaction history
      setDiscoveryStatus('📜 Analyzing your transaction history for certificate contracts...');
      const contractsFromHistory = await getContractsFromTransactionHistory();

          // Method 2: Add your specific contract for testing
    const testContracts = [
      process.env.REACT_APP_DEPLOYED_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000', // Your deployed contract
      ...contractsFromHistory
    ];

      // Method 3: Add any saved contracts
      const savedContracts = knownContracts.map(c => c.address);

      // Combine all potential contracts (remove duplicates)
      const allContracts = [...new Set([...testContracts, ...savedContracts])];

      setDiscoveryStatus(`🔍 Checking ${allContracts.length} contracts for your certificates...`);

      for (let i = 0; i < allContracts.length; i++) {
        const contractAddress = allContracts[i];
        try {
          setDiscoveryStatus(`🔍 Checking contract ${i + 1}/${allContracts.length}: ${contractAddress.slice(0,10)}...`);

          const certificate = await checkContractForCertificate(contractAddress);
          if (certificate) {
            foundCertificates.push(certificate);
            setDiscoveryStatus(`✅ Found certificate in ${certificate.contractName}!`);

            // Save this contract for future scans
            addKnownContract(contractAddress, certificate.contractName);
          }
        } catch (error) {
          console.log(`Contract ${contractAddress} check failed:`, error.message);
        }
      }

      setCertificates(foundCertificates);

      if (foundCertificates.length === 0) {
        setDiscoveryStatus('');
        setError(`🔍 Scan complete - no certificates found in ${allContracts.length} contracts.

Checked contracts:
${allContracts.slice(0, 5).map(addr => `• ${addr}`).join('\n')}
${allContracts.length > 5 ? `• ... and ${allContracts.length - 5} more` : ''}

💡 If you have certificates, try adding the contract address manually below.`);
      } else {
        setDiscoveryStatus(`🎉 Found ${foundCertificates.length} certificate${foundCertificates.length > 1 ? 's' : ''}!`);
        setTimeout(() => setDiscoveryStatus(''), 3000);
      }

    } catch (error) {
      console.error('Error scanning for certificates:', error);
      setError('Failed to scan for certificates: ' + error.message);
      setDiscoveryStatus('');
    } finally {
      setLoading(false);
    }
  };

  const getContractsFromTransactionHistory = async () => {
    try {
      const response = await fetch(
        `/api/etherscan/account?action=txlist&address=${account}&startblock=0&endblock=99999999&sort=desc`
      );

      const data = await response.json();
      const contracts = new Set();

      if (data.status === '1' && data.result) {
        console.log(`📊 Analyzing ${data.result.length} transactions...`);

        data.result.forEach(tx => {
          // Add any contract the user interacted with
          if (tx.to && tx.to !== account && tx.input && tx.input !== '0x') {
            contracts.add(tx.to);
          }
        });

        console.log(`🎯 Found ${contracts.size} unique contract interactions`);
      }

      return Array.from(contracts);
    } catch (error) {
      console.log('Transaction history scan failed:', error.message);
      return [];
    }
  };

  const discoverContractsFromHistory = async () => {
    try {
      console.log('🔍 Starting automatic certificate discovery...');

      // Method 1: Check transaction history for certificate claims
      await discoverFromTransactionHistory();

      // Method 2: Check for ERC721 events involving this address
      await discoverFromERC721Events();

      // Method 3: Check common certificate contract patterns
      await discoverFromCommonPatterns();

    } catch (error) {
      console.log('Auto-discovery completed with some limitations:', error.message);
    }
  };

  const discoverFromTransactionHistory = async () => {
    try {
      console.log('📜 Scanning transaction history...');

      const response = await fetch(
        `/api/etherscan/account?action=txlist&address=${account}&startblock=0&endblock=99999999&sort=desc`
      );

      const data = await response.json();

      if (data.status === '1' && data.result) {
        console.log(`📊 Found ${data.result.length} transactions to analyze`);

        const contractAddresses = new Set();

        // Look for certificate-related function calls
        data.result.forEach(tx => {
          if (tx.to && tx.input && tx.input !== '0x') {
            // Check for common certificate function signatures
            const input = tx.input.toLowerCase();

            // claimCertificate, claimSoulboundCertificate, mint, etc.
            if (input.includes('claim') ||
                input.startsWith('0x4ee5e690') || // claimCertificate signature
                input.startsWith('0x40c10f19') || // mint signature
                input.startsWith('0xa0712d68')) { // mint signature variant
              contractAddresses.add(tx.to);
              console.log(`🎯 Found potential certificate contract: ${tx.to}`);
            }
          }
        });

        // Check each discovered contract
        for (const contractAddress of contractAddresses) {
          await checkAndAddContract(contractAddress);
        }
      }
    } catch (error) {
      console.log('Transaction history scan completed:', error.message);
    }
  };

  const discoverFromERC721Events = async () => {
    try {
      console.log('🎭 Scanning for NFT events...');

      // Get ERC721 Transfer events TO this address
      const response = await fetch(
        `/api/etherscan/logs?action=getLogs&fromBlock=0&toBlock=latest&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&topic2=0x000000000000000000000000${account.slice(2)}`
      );

      const data = await response.json();

      if (data.status === '1' && data.result) {
        console.log(`🎨 Found ${data.result.length} NFT transfer events`);

        const contractAddresses = new Set();

        data.result.forEach(log => {
          if (log.address) {
            contractAddresses.add(log.address);
            console.log(`🎯 Found NFT contract: ${log.address}`);
          }
        });

        // Check each contract for soulbound certificates
        for (const contractAddress of contractAddresses) {
          await checkAndAddContract(contractAddress);
        }
      }
    } catch (error) {
      console.log('ERC721 events scan completed:', error.message);
    }
  };

  const discoverFromCommonPatterns = async () => {
    try {
      console.log('🔍 Checking common certificate patterns...');

      // Get internal transactions (contract creations you might have interacted with)
      const response = await fetch(
        `/api/etherscan/account?action=txlistinternal&address=${account}&startblock=0&endblock=99999999&sort=desc`
      );

      const data = await response.json();

      if (data.status === '1' && data.result) {
        console.log(`🏗️ Found ${data.result.length} internal transactions`);

        const contractAddresses = new Set();

        data.result.forEach(tx => {
          if (tx.to && tx.to !== account) {
            contractAddresses.add(tx.to);
          }
          if (tx.contractAddress) {
            contractAddresses.add(tx.contractAddress);
          }
        });

        // Check each contract
        for (const contractAddress of contractAddresses) {
          await checkAndAddContract(contractAddress);
        }
      }
    } catch (error) {
      console.log('Common patterns scan completed:', error.message);
    }
  };

  const checkAndAddContract = async (contractAddress) => {
    try {
      // First, try to check if it's a soulbound certificate contract
      const contract = new ethers.Contract(contractAddress, [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function hasSoulboundCertificate(address) view returns (bool)",
        "function balanceOf(address) view returns (uint256)",
        "function ownerOf(uint256) view returns (address)",
        "function soulboundOwnerOf(uint256) view returns (address)"
      ], provider);

      let name = '';
      let hasCert = false;

      try {
        name = await contract.name();

        // Try soulbound-specific function first
        try {
          hasCert = await contract.hasSoulboundCertificate(account);
          console.log(`✅ Soulbound check for ${contractAddress}: ${hasCert}`);
        } catch (soulboundError) {
          // If soulbound function doesn't exist, try standard ERC721
          try {
            const balance = await contract.balanceOf(account);
            hasCert = balance.gt(0);
            console.log(`✅ ERC721 balance for ${contractAddress}: ${balance.toString()}`);
          } catch (balanceError) {
            console.log(`❌ Not a valid NFT contract: ${contractAddress}`);
            return;
          }
        }

        if (hasCert) {
          console.log(`🎉 Found certificate in ${contractAddress} (${name})`);
          addKnownContract(contractAddress, name);
        }

      } catch (nameError) {
        console.log(`❌ Could not get contract name for ${contractAddress}`);
      }

    } catch (error) {
      // Not a valid contract or doesn't have the functions we need
      console.log(`❌ Contract check failed for ${contractAddress}:`, error.message);
    }
  };

  const checkContractForCertificate = async (contractAddress) => {
    try {
      console.log(`🔍 Checking contract ${contractAddress} for certificates...`);

      // Create contract instance with comprehensive ABI
      const fullABI = [
        "function hasSoulboundCertificate(address) view returns (bool)",
        "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
        "function soulboundOwnerOf(uint256) view returns (address)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function ownerOf(uint256) view returns (address)",
        "function tokenURI(uint256) view returns (string)"
      ];

      const contract = new ethers.Contract(contractAddress, fullABI, provider);

      let hasCertificate = false;
      let certificateDetails = null;
      let contractName = '';
      let contractSymbol = '';
      let totalSupply = '0';

      try {
        // Get basic contract info first
        contractName = await contract.name();
        contractSymbol = await contract.symbol();
        totalSupply = (await contract.totalSupply()).toString();

        console.log(`📄 Contract: ${contractName} (${contractSymbol}), Total Supply: ${totalSupply}`);
      } catch (error) {
        console.log(`❌ Not a valid NFT contract: ${contractAddress}`);
        return null;
      }

      // Method 1: Try soulbound-specific functions
      try {
        hasCertificate = await contract.hasSoulboundCertificate(account);
        console.log(`🔗 Soulbound check result: ${hasCertificate}`);

        if (hasCertificate) {
          const [exists, tokenId, uri] = await contract.getSoulboundCertificateDetails(account);
          certificateDetails = { exists, tokenId, uri };
          console.log(`✅ Soulbound certificate found! Token ID: ${tokenId.toString()}`);
        }
      } catch (soulboundError) {
        console.log(`📝 No soulbound functions, trying standard ERC721...`);

        // Method 2: Try standard ERC721 functions
        try {
          const balance = await contract.balanceOf(account);
          hasCertificate = balance.gt(0);
          console.log(`📊 ERC721 balance: ${balance.toString()}`);

          if (hasCertificate) {
            // For standard ERC721, we need to find the token ID
            // This is a simplified approach - in reality, you'd need to iterate through tokens
            try {
              const tokenId = 1; // Assuming token ID 1 for simplicity
              const owner = await contract.ownerOf(tokenId);
              if (owner.toLowerCase() === account.toLowerCase()) {
                const uri = await contract.tokenURI(tokenId);
                certificateDetails = { exists: true, tokenId: ethers.BigNumber.from(tokenId), uri };
                console.log(`✅ Standard NFT certificate found! Token ID: ${tokenId}`);
              }
            } catch (ownerError) {
              console.log(`📝 Could not determine token ownership details`);
            }
          }
        } catch (erc721Error) {
          console.log(`❌ Not a valid certificate contract: ${contractAddress}`);
          return null;
        }
      }

      if (!hasCertificate) {
        console.log(`❌ No certificates found for ${account} in ${contractAddress}`);
        return null;
      }

      // Fetch metadata if we have a URI
      let metadata = {};
      if (certificateDetails && certificateDetails.uri) {
        try {
          let metadataUrl = certificateDetails.uri;
          if (metadataUrl.startsWith('ipfs://')) {
            metadataUrl = metadataUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          }

          console.log(`📄 Fetching metadata from: ${metadataUrl}`);
          const response = await fetch(metadataUrl);
          metadata = await response.json();
          console.log(`✅ Metadata loaded: ${metadata.name || 'Unnamed'}`);
        } catch (metadataError) {
          console.error('Error fetching metadata:', metadataError);
          metadata = { name: contractName, description: 'Certificate metadata could not be loaded' };
        }
      }

      const result = {
        contractAddress,
        contractName,
        contractSymbol,
        tokenId: certificateDetails ? certificateDetails.tokenId.toString() : '1',
        uri: certificateDetails ? certificateDetails.uri : '',
        metadata,
        totalSupply,
        discoveredAt: new Date().toISOString()
      };

      console.log(`🎉 Certificate found and processed:`, result);
      return result;

    } catch (error) {
      console.log(`❌ Error checking contract ${contractAddress}:`, error.message);
      return null;
    }
  };

  const addCustomContract = async () => {
    if (!customContract || !ethers.utils.isAddress(customContract)) {
      setError('Please enter a valid contract address');
      return;
    }

    setLoading(true);
    setError('');
    setDiscoveryStatus(`🔍 Checking contract ${customContract}...`);

    try {
      const certificate = await checkContractForCertificate(customContract);

      if (certificate) {
        // Add to known contracts
        addKnownContract(customContract, certificate.contractName);

        // Add to current certificates
        setCertificates(prev => [...prev.filter(c => c.contractAddress !== customContract), certificate]);
        setCustomContract('');
        setDiscoveryStatus(`✅ Found certificate in ${certificate.contractName}!`);
        setTimeout(() => setDiscoveryStatus(''), 3000);
      } else {
        setError('No certificate found for your wallet in this contract');
        setDiscoveryStatus('');
      }
    } catch (error) {
      setError('Error checking contract: ' + error.message);
      setDiscoveryStatus('');
    } finally {
      setLoading(false);
    }
  };

  const testYourContract = async () => {
    const yourContract = process.env.REACT_APP_DEPLOYED_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    setLoading(true);
    setError('');
    setDiscoveryStatus(`🔍 Testing your specific contract: ${yourContract}...`);

    try {
      const certificate = await checkContractForCertificate(yourContract);

      if (certificate) {
        addKnownContract(yourContract, certificate.contractName);
        setCertificates([certificate]);
        setDiscoveryStatus(`✅ Found your certificate in ${certificate.contractName}!`);
        setTimeout(() => setDiscoveryStatus(''), 3000);
      } else {
        setError(`No certificate found in your contract ${yourContract}. This could mean:
• The certificate hasn't been claimed yet
• The contract uses different function names
• There's a network connectivity issue

Try checking the contract on Etherscan to verify it exists and has the right functions.`);
        setDiscoveryStatus('');
      }
    } catch (error) {
      setError('Error checking your contract: ' + error.message);
      setDiscoveryStatus('');
    } finally {
      setLoading(false);
    }
  };

  const shareToLinkedIn = (certificate) => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      `${window.location.origin}/verify?contract=${certificate.contractAddress}&wallet=${account}`
    )}`;
    
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = (certificate) => {
    const tweetText = `🎓 I just earned a verified blockchain certificate: ${certificate.metadata.name || certificate.contractName}! 

🔗 Soulbound & tamper-proof
✅ Blockchain verified
🌐 View verification: ${window.location.origin}/verify?contract=${certificate.contractAddress}&wallet=${account}

#BlockchainCertificate #Web3Education #SoulboundNFT`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const copyVerificationLink = (certificate) => {
    const verificationUrl = `${window.location.origin}/verify?contract=${certificate.contractAddress}&wallet=${account}`;
    navigator.clipboard.writeText(verificationUrl);
    alert('Verification link copied to clipboard!');
  };

  const downloadCertificate = (certificate) => {
    const certificateData = {
      holder: account,
      certificate: {
        name: certificate.metadata.name || certificate.contractName,
        description: certificate.metadata.description,
        issuer: certificate.contractName,
        tokenId: certificate.tokenId,
        contractAddress: certificate.contractAddress,
        blockchain: 'Ethereum Sepolia',
        uri: certificate.uri,
        metadata: certificate.metadata
      },
      verification: {
        verificationUrl: `${window.location.origin}/verify?contract=${certificate.contractAddress}&wallet=${account}`,
        etherscanUrl: `https://sepolia.etherscan.io/address/${certificate.contractAddress}#readContract`,
        blockchainProof: 'This certificate is permanently bound to the holder\'s wallet and cannot be transferred'
      },
      exportedAt: new Date().toISOString()
    };

    const jsonData = JSON.stringify(certificateData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate-${certificate.metadata.name || certificate.contractName}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const exportCertificatePortfolio = () => {
    const portfolio = {
      holder: {
        walletAddress: account,
        totalCertificates: certificates.length,
        portfolioGeneratedAt: new Date().toISOString()
      },
      certificates: certificates.map(cert => ({
        name: cert.metadata.name || cert.contractName,
        description: cert.metadata.description,
        issuer: cert.contractName,
        issuerSymbol: cert.contractSymbol,
        tokenId: cert.tokenId,
        contractAddress: cert.contractAddress,
        issueDate: cert.metadata.attributes?.find(attr => attr.trait_type === 'Issue Date')?.value,
        imageUrl: cert.metadata.image,
        metadataUri: cert.uri,
        verificationUrl: `${window.location.origin}/verify?contract=${cert.contractAddress}&wallet=${account}`,
        etherscanUrl: `https://sepolia.etherscan.io/address/${cert.contractAddress}#readContract`
      })),
      verification: {
        blockchain: 'Ethereum Sepolia Testnet',
        certificateType: 'Soulbound NFT (Non-transferable)',
        verificationMethod: 'Smart Contract Functions',
        note: 'All certificates are permanently bound to the holder\'s wallet and cannot be transferred'
      }
    };

    const jsonData = JSON.stringify(portfolio, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate-portfolio-${account.slice(0,8)}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const sharePortfolioToLinkedIn = () => {
    const portfolioText = `🎓 My Blockchain Certificate Portfolio

I've earned ${certificates.length} verified soulbound certificate${certificates.length > 1 ? 's' : ''} on the blockchain:

${certificates.map(cert => `✅ ${cert.metadata.name || cert.contractName}`).join('\n')}

🔗 All certificates are permanently bound to my wallet
✅ Blockchain verified and tamper-proof
🌐 Public verification available

#BlockchainCertificates #Web3Education #SoulboundNFT #DigitalCredentials`;

    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      `${window.location.origin}/my-certificates`
    )}`;

    // Copy text to clipboard for user to paste
    navigator.clipboard.writeText(portfolioText);
    alert('Portfolio text copied to clipboard! Paste it in your LinkedIn post.');

    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  if (!account) {
    return (
      <motion.div
        className="premium-wallet-connect-container"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="card premium-connect-card"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card-body text-center">
            <motion.div
              className="connect-icon-container"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Wallet size={64} className="connect-icon" />
            </motion.div>
            <h2 className="card-title premium-card-title brand-font">Connect Your Wallet</h2>
            <p className="card-text premium-card-text body-font">
              Please connect your MetaMask wallet to view and manage your certificates.
            </p>
            <motion.button
              className="btn btn-primary btn-lg premium-connect-btn body-font"
              onClick={connectWallet}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Wallet className="me-2" />
              Connect Wallet
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="my-certificates-dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div 
        className="portal-header premium-portal-header"
        variants={itemVariants}
      >
        <motion.div
          className="header-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="header-icon-container"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <Award size={48} className="header-icon" />
          </motion.div>
          <h1 className="portal-title brand-font">My Certificates</h1>
          <p className="portal-subtitle body-font">
            View and manage your blockchain certificates and digital achievements
          </p>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <motion.div 
        className="row mt-2"
        variants={itemVariants}
      >
        <motion.div 
          className="col-lg-10 mx-auto"
          variants={cardVariants}
        >
          <motion.div 
            className="card premium-portal-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-header premium-card-header">
              <h3 className="card-title premium-card-title body-font">
                <Award className="me-2" />
                Certificate Discovery & Management
              </h3>
            </div>
            <div className="card-body">
              <div className="alert alert-info premium-alert">
                <h6>🔍 Automatic Certificate Discovery</h6>
                <p className="mb-0">
                  We'll automatically scan the blockchain for your certificates. You can also manually add contract addresses.
                </p>
              </div>

              <motion.button
                className="btn btn-primary premium-btn mb-3"
                onClick={scanForCertificates}
                disabled={loading}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                {loading ? (
                  <>
                    <Loader2 className="me-2 loading-spinner" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="me-2" />
                    Scan for Certificates
                  </>
                )}
              </motion.button>

              {discoveryStatus && (
                <motion.div
                  className="alert alert-info premium-alert"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <RefreshCw className="me-2 loading-spinner" />
                  {discoveryStatus}
                </motion.div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="alert alert-danger premium-alert"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h6>❌ Error</h6>
                    <p className="mb-0">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add Custom Contract */}
              <div className="card mb-4">
                <div className="card-header">
                  <h6 style={{ color: '#efe8ff' }} className="mb-0">➕ Add Certificate Contract</h6>
                </div>
                <div className="card-body">
                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter contract address (0x...)"
                      value={customContract}
                      onChange={(e) => setCustomContract(e.target.value)}
                    />
                    <button
                      className="btn btn-outline-primary"
                      onClick={addCustomContract}
                      disabled={loading}
                    >
                      Add Contract
                    </button>
                  </div>

                  <div className="alert alert-info">
                    <h6 style={{ color: '#ffffff' }}>💡 How to find your certificates:</h6>
                    <ul className="mb-2" style={{ color: '#ffffff' }}>
                      <li><strong>Automatic Discovery:</strong> Click "Automatically Discover" above - scans your transaction history</li>
                      <li><strong>From Organizer:</strong> Get contract address from certificate organizer</li>
                      <li><strong>From Email/Download:</strong> Check certificate claim emails or downloaded files</li>
                      <li><strong>From Etherscan:</strong> Look at your wallet's transaction history</li>
                    </ul>
                    <p className="mb-0" style={{ color: '#ffffff' }}><strong>Note:</strong> The automatic discovery scans your blockchain transaction history to find certificate contracts you've interacted with.</p>
                  </div>
                </div>
              </div>

              {/* Scan Buttons */}
              <div className="d-grid gap-2 mb-4">
                <button
                  className="btn btn-primary"
                  onClick={testYourContract}
                  disabled={loading}
                >
                  {loading ? 'Testing...' : '🎯 Test Your Specific Contract (0x767423...)'}
                </button>
              </div>

              {/* Portfolio Actions */}
              {certificates.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 style={{ color: '#ffffff' }} className="mb-0">📤 Share Your Certificate Portfolio</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-linkedin"
                            style={{backgroundColor: '#0077b5', color: 'white'}}
                            onClick={sharePortfolioToLinkedIn}
                          >
                            �� Share Portfolio on LinkedIn
                          </button>

                          <button
                            className="btn btn-outline-success"
                            onClick={exportCertificatePortfolio}
                          >
                            📥 Export Complete Portfolio
                          </button>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="alert alert-info mb-0">
                          <h6 style={{ color: '#ffffff' }}>🎓 Your Portfolio</h6>
                          <p className="mb-1" style={{ color: '#ffffff' }}><strong>{certificates.length}</strong> verified certificate{certificates.length > 1 ? 's' : ''}</p>
                          <p className="mb-0" style={{ color: '#ffffff' }}>All permanently bound to your wallet</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Certificates Display */}
              {certificates.length > 0 && (
                <div className="certificates-grid">
                  <h5 style={{ color: '#ffffff' }} className="mb-3">Your Soulbound Certificates:</h5>
                  {certificates.map((cert, index) => (
                    <div key={index} className="card mb-4 border-primary">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-8">
                            <h5 className="card-title" style={{ color: '#ffffff' }}>
                              🎓 {cert.metadata.name || cert.contractName}
                            </h5>
                            <p className="card-text" style={{ color: '#ffffff' }}>
                              {cert.metadata.description || 'Soulbound Certificate'}
                            </p>
                            
                            <div className="certificate-info">
                              <p className="mb-1" style={{ color: '#ffffff' }}><strong>Issuer:</strong> {cert.contractName} ({cert.contractSymbol})</p>
                              <p className="mb-1" style={{ color: '#ffffff' }}><strong>Token ID:</strong> {cert.tokenId}</p>
                              <p className="mb-1" style={{ color: '#ffffff' }}><strong>Issue Date:</strong> {
                                cert.metadata.attributes?.find(attr => attr.trait_type === 'Issue Date')?.value || 'Not specified'
                              }</p>
                              <p className="mb-1" style={{ color: '#ffffff' }}><strong>Status:</strong> 
                                <span className="badge bg-success ms-2">VERIFIED ✅</span>
                              </p>
                            </div>

                            {/* Sharing Options */}
                            <div className="sharing-options mt-3">
                              <h6 style={{ color: '#ffffff' }}>📤 Share Certificate:</h6>
                              <div className="btn-group-vertical d-grid gap-2">
                                <button 
                                  className="btn btn-linkedin"
                                  style={{backgroundColor: '#0077b5', color: 'white'}}
                                  onClick={() => shareToLinkedIn(cert)}
                                >
                                  💼 Share on LinkedIn
                                </button>
                                
                                <button 
                                  className="btn btn-twitter"
                                  style={{backgroundColor: '#1da1f2', color: 'white'}}
                                  onClick={() => shareToTwitter(cert)}
                                >
                                  🐦 Share on Twitter
                                </button>
                                
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => copyVerificationLink(cert)}
                                >
                                  📋 Copy Verification Link
                                </button>
                                
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => downloadCertificate(cert)}
                                >
                                  📥 Download Certificate Data
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-4 text-center">
                            {cert.metadata.image && (
                              <img 
                                src={cert.metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                                alt="Certificate" 
                                className="img-fluid rounded border mb-3"
                                style={{maxHeight: '200px'}}
                              />
                            )}
                            
                            <div className="d-grid gap-2">
                              <a 
                                href={`https://sepolia.etherscan.io/address/${cert.contractAddress}#readContract`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-info btn-sm"
                              >
                                🔍 Verify on Etherscan
                              </a>
                              
                              <a 
                                href={cert.uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-secondary btn-sm"
                              >
                                📄 View Metadata
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {certificates.length === 0 && !loading && (
                <div className="alert alert-info text-center">
                  <h5 style={{ color: '#ffffff' }}>🔍 No Certificates Found</h5>
                  <p style={{ color: '#ffffff' }}>Add certificate contract addresses above to discover your certificates.</p>
                  <p className="mb-0" style={{ color: '#ffffff' }}>Your certificates will appear here once contracts are added.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default MyCertificatesDashboard;
