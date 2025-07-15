import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Wallet,
  Award,
  FileText,
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { hasAddressClaimed, isAddressEligible, claimCertificate, getEventDetails } from '../utils/contractUtils';
import { verifyMerkleProof } from '../utils/merkleUtils';
import { autoAddCertificateToMetaMask, addSoulboundCertificateToMetaMask, verifyCertificateInMetaMask } from '../utils/metamaskUtils';

const StudentPortal = ({ account, provider, signer, connectWallet }) => {
  const [contractAddress, setContractAddress] = useState('');
  const [merkleProof, setMerkleProof] = useState('');
  const [isEligible, setIsEligible] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [step, setStep] = useState(1);

  // Certificate viewer state
  const [viewerContractAddress, setViewerContractAddress] = useState('');
  const [myCertificates, setMyCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

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

  // Reset state when account changes
  useEffect(() => {
    if (account) {
      setIsEligible(false);
      setHasClaimed(false);
      setEventDetails(null);
      setError('');
      setSuccessMsg('');
    }
  }, [account]);

  // Check if the user has already claimed when contract address and proof are set
  useEffect(() => {
    const checkClaimed = async () => {
      if (contractAddress && account && provider) {
        try {
          const claimed = await hasAddressClaimed(contractAddress, account, provider);
          setHasClaimed(claimed);
          
          if (claimed) {
            setSuccessMsg('You have already claimed your certificate!');
          }
        } catch (error) {
          console.error('Error checking claim status:', error);
          setError('Failed to check if you have already claimed.');
        }
      }
    };

    checkClaimed();
  }, [contractAddress, account, provider]);

  // Fetch event details when contract address is set
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (contractAddress && provider) {
        try {
          setLoading(true);
          const details = await getEventDetails(contractAddress, provider);
          setEventDetails(details);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching event details:', error);
          setError('Failed to fetch event details. Please check the contract address.');
          setLoading(false);
        }
      }
    };

    fetchEventDetails();
  }, [contractAddress, provider]);

  // Handle form submission to verify eligibility
  const handleVerifyEligibility = async (e) => {
    e.preventDefault();

    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!contractAddress) {
      setError('Please enter a contract address.');
      return;
    }

    if (!merkleProof) {
      setError('Please enter your Merkle proof.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Parse the Merkle proof JSON
      let parsedProof;
      try {
        parsedProof = JSON.parse(merkleProof);
      } catch (parseError) {
        setError('Invalid JSON format for Merkle proof. Please check the format.');
        setLoading(false);
        return;
      }

      console.log('Debug info:');
      console.log('Your wallet address:', account);
      console.log('Contract address:', contractAddress);
      console.log('Parsed proof:', parsedProof);

      // Check if already claimed first
      const hasClaimed = await hasAddressClaimed(contractAddress, account, provider);
      console.log('Has already claimed:', hasClaimed);

      if (hasClaimed) {
        setError('You have already claimed this certificate.');
        setLoading(false);
        return;
      }

      // Get contract details for debugging
      try {
        const contract = new ethers.Contract(contractAddress, [
          "function merkleRoot() view returns (bytes32)",
          "function isEligible(address, bytes32[]) view returns (bool)",
          "function hasClaimed(address) view returns (bool)"
        ], provider);

        const contractMerkleRoot = await contract.merkleRoot();
        console.log('Contract Merkle Root:', contractMerkleRoot);
        console.log('Your Merkle proof from JSON:', parsedProof);

        // Try to extract the expected root from the proof structure if it's an object
        let expectedRoot = 'Not provided';
        if (typeof parsedProof === 'object' && parsedProof.merkleRoot) {
          expectedRoot = parsedProof.merkleRoot;
        }
        console.log('Expected Merkle Root from your proof:', expectedRoot);

        // Test what the leaf hash should be
        const leafHash = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [account]));
        console.log('Leaf hash for your address:', leafHash);
        console.log('Is leaf hash same as merkle root?', leafHash.toLowerCase() === contractMerkleRoot.toLowerCase());

        // UNIVERSAL verification testing - works for ANY number of addresses
        const { MerkleTree } = require('merkletreejs');
        const keccak256 = require('keccak256');

        console.log('🔍 UNIVERSAL MERKLE VERIFICATION TEST');
        console.log('👤 Your address:', account);
        console.log('🔐 Your proof:', parsedProof);
        console.log('📏 Proof length:', parsedProof.length);
        console.log('🌳 Contract root:', contractMerkleRoot);

        // Generate leaf using SAME encoding as contract
        const contractLeaf = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [account.toLowerCase()]));
        console.log('🍃 Contract-compatible leaf:', contractLeaf);

        // UNIVERSAL verification - works for 1, 2, or any number of addresses
        try {
          // Manual verification using same logic as contract
          let computedHash = contractLeaf;

          console.log('🔄 Starting verification process...');
          console.log('🍃 Initial hash (leaf):', computedHash);

          for (let i = 0; i < parsedProof.length; i++) {
            const proofElement = parsedProof[i];
            console.log(`🔗 Step ${i + 1}: Combining with ${proofElement}`);

            // Same logic as contract: sort pairs
            if (computedHash <= proofElement) {
              computedHash = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'bytes32'], [computedHash, proofElement]));
            } else {
              computedHash = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'bytes32'], [proofElement, computedHash]));
            }
            console.log(`🔄 Result after step ${i + 1}:`, computedHash);
          }

          console.log('🎯 Final computed hash:', computedHash);
          console.log('🌳 Contract root:', contractMerkleRoot);

          const isValidProof = computedHash.toLowerCase() === contractMerkleRoot.toLowerCase();
          console.log('✅ UNIVERSAL PROOF VERIFICATION RESULT:', isValidProof);

          if (parsedProof.length === 0) {
            console.log('📝 Single address case: leaf should equal root');
          } else {
            console.log(`📝 Multiple address case: ${parsedProof.length} proof elements processed`);
          }

        } catch (verifyError) {
          console.log('❌ Verification error:', verifyError);
        }

        // Check eligibility using the contract
      const eligible = await isAddressEligible(contractAddress, account, parsedProof, provider);
        console.log('Contract eligibility check result:', eligible);

      if (eligible) {
          setIsEligible(true);
          setSuccessMsg('✅ You are eligible to claim this certificate!');
        setStep(2);
      } else {
          setError('❌ You are not eligible for this certificate. Please check your Merkle proof.');
        }
      } catch (contractError) {
        console.error('Contract interaction error:', contractError);
        setError('Failed to verify eligibility. Please check the contract address and try again.');
      }
    } catch (error) {
      console.error('Error verifying eligibility:', error);
      setError('An error occurred while verifying eligibility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle certificate claiming
  const handleClaimCertificate = async (e) => {
    e.preventDefault();
    
    if (!account || !signer) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!contractAddress || !merkleProof) {
      setError('Please complete the verification step first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      let parsedProof;
      try {
        parsedProof = JSON.parse(merkleProof);
      } catch (parseError) {
        setError('Invalid JSON format for Merkle proof.');
        setLoading(false);
        return;
      }

      const tx = await claimCertificate(contractAddress, parsedProof, signer);
      console.log('Transaction hash:', tx.hash);

      setSuccessMsg(`🎉 Certificate claimed successfully! Transaction hash: ${tx.hash}`);
      setHasClaimed(true);
      setStep(3);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction mined:', receipt);

      // Try to add to MetaMask
      try {
        await autoAddCertificateToMetaMask(contractAddress, account, provider);
        setSuccessMsg(prev => prev + ' Certificate has been added to your MetaMask wallet!');
      } catch (metamaskError) {
        console.log('MetaMask add failed:', metamaskError);
          // Don't show error to user as this is optional
        }

    } catch (error) {
      console.error('Error claiming certificate:', error);
      if (error.code === 4001) {
        setError('Transaction was rejected by user.');
      } else if (error.message.includes('already claimed')) {
        setError('You have already claimed this certificate.');
        setHasClaimed(true);
      } else {
        setError('Failed to claim certificate. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle viewing certificates
  const handleViewCertificates = async (e) => {
    e.preventDefault();

    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!viewerContractAddress) {
      setError('Please enter a contract address.');
      return;
    }

    setLoadingCertificates(true);
    setError('');
    setSuccessMsg('');

    try {
      const contract = new ethers.Contract(viewerContractAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function tokenOfOwnerByIndex(address, uint256) view returns (uint256)",
        "function tokenURI(uint256) view returns (string)"
      ], provider);

      const balance = await contract.balanceOf(account);
      console.log('Balance:', balance.toString());

      const certificates = [];
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(account, i);
          const tokenURI = await contract.tokenURI(tokenId);
          certificates.push({
            tokenId: tokenId.toString(),
            tokenURI: tokenURI
          });
        } catch (error) {
          console.error(`Error fetching token ${i}:`, error);
        }
      }

      setMyCertificates(certificates);
      setShowViewer(true);
      setSuccessMsg(`Found ${certificates.length} certificate(s) in your wallet!`);

    } catch (error) {
      console.error('Error fetching certificates:', error);
      setError('Failed to fetch certificates. Please check the contract address.');
    } finally {
      setLoadingCertificates(false);
    }
  };

  // Add certificate to MetaMask
  const addCertificateToMetaMask = async (certificate) => {
    try {
      await addSoulboundCertificateToMetaMask(
        viewerContractAddress,
        certificate.tokenId,
        certificate.tokenURI
      );
      setSuccessMsg('Certificate added to MetaMask successfully!');
    } catch (error) {
      console.error('Error adding to MetaMask:', error);
      setError('Failed to add certificate to MetaMask.');
    }
  };

  // Add contract to MetaMask
  const addContractToMetaMask = async (contractAddress, contractName, contractSymbol) => {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: contractAddress,
            name: contractName,
            symbol: contractSymbol,
            image: 'https://via.placeholder.com/200x200/667eea/ffffff?text=NFT'
          }
        }
      });
      setSuccessMsg('Contract added to MetaMask successfully!');
    } catch (error) {
      console.error('Error adding contract to MetaMask:', error);
      setError('Failed to add contract to MetaMask.');
    }
  };

  // Verify certificate in MetaMask
  const verifyCertificateInMetaMaskLocal = async (certificate) => {
    try {
      const isValid = await verifyCertificateInMetaMask(
        viewerContractAddress,
        certificate.tokenId,
        certificate.tokenURI
      );
      
      if (isValid) {
        setSuccessMsg('Certificate verification successful!');
      } else {
        setError('Certificate verification failed.');
      }
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setError('Failed to verify certificate.');
    }
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
              Please connect your MetaMask wallet to access the Student Portal and claim your certificates.
            </p>
            <motion.button
              className="btn btn-primary btn-lg premium-connect-btn body-font"
              onClick={connectWallet}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Wallet className="me-2" />
              Connect Wallet
              <ArrowRight className="ms-2" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="student-portal-container"
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
            <GraduationCap size={48} className="header-icon" />
          </motion.div>
          <h1 className="portal-title brand-font">Student Portal</h1>
          <p className="portal-subtitle body-font">
            Claim your event certificates as NFTs and manage your digital achievements
          </p>
        </motion.div>
      </motion.div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="alert alert-danger premium-alert"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AlertCircle className="me-2" />
            {error}
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            className="alert alert-success premium-alert"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CheckCircle className="me-2" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div 
        className="row"
        variants={itemVariants}
      >
        {/* Claim Certificate Section */}
        <motion.div 
          className="col-lg-8 mb-4"
          variants={itemVariants}
        >
          <motion.div 
            className="card premium-portal-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-header premium-card-header">
              <h3 className="card-title premium-card-title body-font">
                <Award className="me-2" />
                Claim Your Certificate
              </h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleVerifyEligibility}>
                  <div className="mb-3">
                  <label htmlFor="contractAddress" className="form-label premium-form-label body-font">
                    Contract Address
                  </label>
                    <input
                      type="text"
                    className="form-control premium-form-control"
                      id="contractAddress"
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="Enter the certificate contract address"
                      required
                    />
                  </div>
                  <div className="mb-3">
                  <label htmlFor="merkleProof" className="form-label premium-form-label body-font">
                    Merkle Proof
                  </label>
                    <textarea
                    className="form-control premium-form-control"
                      id="merkleProof"
                      value={merkleProof}
                      onChange={(e) => setMerkleProof(e.target.value)}
                    placeholder="Enter your Merkle proof (JSON format)"
                    rows="4"
                      required
                  />
                </div>
                <motion.button
                  type="submit"
                  className="btn btn-primary premium-submit-btn body-font"
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="me-2 loading-spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="me-2" />
                      Verify Eligibility
                      <ArrowRight className="ms-2" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Event Details */}
                {eventDetails && (
                <motion.div
                  className="event-details premium-event-details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h4 className="event-title body-font">
                    <Sparkles className="me-2" />
                    Event Details
                  </h4>
                  <div className="event-info body-font">
                    <p><strong>Event Name:</strong> {eventDetails.name}</p>
                    <p><strong>Event Date:</strong> {eventDetails.date}</p>
                    <p><strong>Organizer:</strong> {eventDetails.organizer}</p>
                  </div>
                </motion.div>
              )}

              {/* Claim Button */}
              {isEligible && !hasClaimed && (
                <motion.div
                  className="claim-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                <form onSubmit={handleClaimCertificate}>
                    <motion.button
                      type="submit" 
                      className="btn btn-success btn-lg premium-claim-btn body-font"
                      disabled={loading}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="me-2 loading-spinner" />
                          Claiming Certificate...
                        </>
                      ) : (
                        <>
                          <Award className="me-2" />
                          Claim Certificate
                          <ArrowRight className="ms-2" />
                        </>
                      )}
                    </motion.button>
                </form>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* View Certificates Section */}
        <motion.div 
          className="col-lg-4 mb-4"
          variants={itemVariants}
        >
          <motion.div 
            className="card premium-portal-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-header premium-card-header">
              <h3 className="card-title premium-card-title body-font">
                <FileText className="me-2" />
                View Certificates
              </h3>
              </div>
              <div className="card-body">
              <form onSubmit={handleViewCertificates}>
                  <div className="mb-3">
                  <label htmlFor="viewerContractAddress" className="form-label premium-form-label body-font">
                    Contract Address
                  </label>
                    <input
                      type="text"
                    className="form-control premium-form-control"
                      id="viewerContractAddress"
                      value={viewerContractAddress}
                      onChange={(e) => setViewerContractAddress(e.target.value)}
                    placeholder="Enter contract address to view certificates"
                      required
                    />
                  </div>
                <motion.button
                    type="submit"
                  className="btn btn-outline-primary premium-view-btn body-font"
                  disabled={loadingCertificates}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loadingCertificates ? (
                    <>
                      <Loader2 className="me-2 loading-spinner" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="me-2" />
                      View Certificates
                      <ArrowRight className="ms-2" />
                    </>
                  )}
                </motion.button>
                </form>

              {/* Certificate List */}
              {showViewer && myCertificates.length > 0 && (
                <motion.div
                  className="certificate-list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h5 className="certificate-list-title body-font">Your Certificates</h5>
                    {myCertificates.map((cert, index) => (
                    <motion.div
                      key={cert.tokenId}
                      className="certificate-item premium-certificate-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="certificate-info">
                        <span className="certificate-id body-font">Token ID: {cert.tokenId}</span>
                        <span className="certificate-uri body-font">URI: {cert.tokenURI}</span>
                              </div>
                      <div className="certificate-actions">
                        <motion.button
                          className="btn btn-sm btn-outline-primary"
                                  onClick={() => addCertificateToMetaMask(cert)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ExternalLink size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default StudentPortal; 