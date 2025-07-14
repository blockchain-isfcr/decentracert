import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
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

      } catch (debugError) {
        console.log('Debug error:', debugError);
      }

      // Check if the user is eligible
      const eligible = await isAddressEligible(contractAddress, account, parsedProof, provider);
      console.log('Is eligible:', eligible);

      setIsEligible(eligible);

      if (eligible) {
        setSuccessMsg('You are eligible to claim this certificate!');
        setStep(2);
      } else {
        setError(`You are not eligible to claim this certificate.

Debug info:
- Your address: ${account}
- Has claimed: ${hasClaimed}
- Make sure your wallet address was included in the original participant list and you're using the correct Merkle proof for YOUR specific address.`);
      }
    } catch (error) {
      console.error('Error verifying eligibility:', error);
      setError('Failed to verify eligibility: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission to claim certificate
  const handleClaimCertificate = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!isEligible) {
      setError('You are not eligible to claim this certificate.');
      return;
    }

    if (hasClaimed) {
      setError('You have already claimed this certificate.');
      return;
    }

    if (!tokenURI) {
      setError('Please enter the token URI for your certificate.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Parse the Merkle proof JSON
      const parsedProof = JSON.parse(merkleProof);
      
      // Claim the certificate
      const receipt = await claimCertificate(contractAddress, parsedProof, tokenURI, signer);

      setSuccessMsg(`Certificate claimed successfully! Transaction hash: ${receipt.transactionHash}`);
      setHasClaimed(true);
      setStep(3);

      // Automatically try to add the certificate to MetaMask
      setTimeout(async () => {
        try {
          await autoAddCertificateToMetaMask(contractAddress, account, provider, eventDetails);
        } catch (autoAddError) {
          console.log('Auto-add to MetaMask failed:', autoAddError);
          // Don't show error to user as this is optional
        }
      }, 2000); // Wait 2 seconds for transaction to be processed
    } catch (error) {
      console.error('Error claiming certificate:', error);
      setError('Failed to claim certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to view certificates from a contract
  const handleViewCertificates = async (e) => {
    e.preventDefault();

    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!viewerContractAddress) {
      setError('Please enter a contract address to view certificates.');
      return;
    }

    setLoadingCertificates(true);
    setError('');
    setMyCertificates([]);

    try {
      // Create contract instance
      const contract = new ethers.Contract(viewerContractAddress, [
        "function hasSoulboundCertificate(address) view returns (bool)",
        "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
        "function soulboundOwnerOf(uint256) view returns (address)",
        "function name() view returns (string)",
        "function symbol() view returns (string)"
      ], provider);

      // Check if user has a certificate
      const hasCertificate = await contract.hasSoulboundCertificate(account);

      if (hasCertificate) {
        // Get certificate details
        const [exists, tokenId, uri] = await contract.getSoulboundCertificateDetails(account);
        const contractName = await contract.name();
        const contractSymbol = await contract.symbol();

        // Fetch metadata from IPFS
        let metadata = {};
        if (uri.startsWith('ipfs://')) {
          try {
            const ipfsHash = uri.replace('ipfs://', '');
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
            metadata = await response.json();
          } catch (metadataError) {
            console.error('Error fetching metadata:', metadataError);
            metadata = { name: 'Certificate', description: 'Unable to load metadata' };
          }
        }

        const certificate = {
          contractAddress: viewerContractAddress,
          contractName,
          contractSymbol,
          tokenId: tokenId.toString(),
          uri,
          metadata,
          exists
        };

        setMyCertificates([certificate]);
        setSuccessMsg(`Found 1 soulbound certificate in your wallet!`);
      } else {
        setMyCertificates([]);
        setSuccessMsg('No certificates found in this contract for your address.');
      }
    } catch (error) {
      console.error('Error viewing certificates:', error);
      setError('Failed to view certificates: ' + error.message);
    } finally {
      setLoadingCertificates(false);
    }
  };

  // Enhanced function to add soulbound certificate to MetaMask NFT collection
  const addCertificateToMetaMask = async (certificate) => {
    try {
      const result = await addSoulboundCertificateToMetaMask(certificate);
      alert(result.message);
      return result;
    } catch (error) {
      console.error('Error adding certificate to MetaMask:', error);
      alert(`Error adding certificate to MetaMask: ${error.message}`);
    }
  };

  // Function to add contract to MetaMask for monitoring
  const addContractToMetaMask = async (contractAddress, contractName, contractSymbol) => {
    try {
      if (!window.ethereum) {
        alert('MetaMask is not installed!');
        return;
      }

      // Add the contract as a custom token (for monitoring purposes)
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Use ERC20 type for contract monitoring
          options: {
            address: contractAddress,
            symbol: contractSymbol,
            decimals: 0,
            image: 'https://via.placeholder.com/64x64.png?text=SBT', // Soulbound Token icon
          },
        },
      });

      if (wasAdded) {
        alert('🔗 Soulbound Certificate Contract added to MetaMask for monitoring!');
      }
    } catch (error) {
      console.error('Error adding contract to MetaMask:', error);
      alert('Error adding contract to MetaMask: ' + error.message);
    }
  };



  // Function to verify certificate with comprehensive checking
  const verifyCertificateInMetaMaskLocal = async (certificate) => {
    try {
      const result = await verifyCertificateInMetaMask(certificate, account);

      if (result.success) {
        const verificationMessage = `
🔗 SOULBOUND CERTIFICATE VERIFICATION COMPLETE

✅ Certificate Status: VERIFIED
✅ Contract: ${result.contractName} (${result.contractSymbol})
✅ Total Certificates Issued: ${result.totalSupply}

🔍 Ownership Verification:
✅ Certificate exists: Yes
✅ Bound to your wallet: ${result.isOwner ? 'YES ✅' : 'NO ❌'}
✅ You have certificate: ${result.hasCertificate ? 'YES ✅' : 'NO ❌'}

📄 Certificate Details:
- Token ID: ${certificate.tokenId}
- Contract Address: ${certificate.contractAddress}
- Metadata URI: ${result.tokenURI}
- Certificate Owner: ${result.owner}
- Your Wallet: ${account}
- Match: ${result.isOwner ? 'PERFECT MATCH ✅' : 'NO MATCH ❌'}

🔗 Blockchain Links:
- Contract: ${result.etherscanUrl}
- Token: ${result.tokenUrl}

🔒 SOULBOUND PROPERTIES:
- ✅ Permanently bound to your wallet
- 🚫 Cannot be transferred or sold
- 🔒 Tamper-proof and immutable
- ✅ Verifiable by anyone on blockchain

${result.isOwner ? '🎉 CONGRATULATIONS! This certificate is authentically yours!' : '⚠️ This certificate belongs to a different wallet.'}
        `;

        alert(verificationMessage);

        // Also open Etherscan for additional verification
        if (result.isOwner) {
          const openEtherscan = confirm('Would you like to view this certificate on Etherscan for additional verification?');
          if (openEtherscan) {
            window.open(result.tokenUrl, '_blank');
          }
        }
      } else {
        alert(`❌ VERIFICATION ERROR\n\nUnable to verify certificate: ${result.error}`);
      }
    } catch (error) {
      console.error('Error verifying certificate:', error);
      alert(`❌ VERIFICATION ERROR\n\nUnexpected error: ${error.message}`);
    }
  };

  return (
    <div className="student-portal">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="section-heading mb-0">🔗 Soulbound Certificate Portal</h2>
        {account && (
          <div className="btn-group" role="group">
            <button
              className={`btn ${!showViewer ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setShowViewer(false)}
            >
              Claim Certificate
            </button>
            <button
              className={`btn ${showViewer ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setShowViewer(true)}
            >
              View My Certificates
            </button>
          </div>
        )}
      </div>
      
      {!account && (
        <div className="alert alert-info">
          <p>Please connect your wallet to claim your certificate.</p>
          <button 
            className="btn btn-primary"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      )}
      
      {account && !showViewer && (
        <div className="row">
          <div className="col-lg-8 mx-auto">
            {/* Step 1: Verify Eligibility */}
            <div className={`card mb-4 ${step !== 1 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">🔗 Step 1: Verify Your Soulbound Certificate Eligibility</h4>
                <p className="mb-0 mt-1"><small>Checking if you're eligible for a non-transferable certificate</small></p>
              </div>
              <div className="card-body">
                <form onSubmit={handleVerifyEligibility}>
                  <div className="mb-3">
                    <label htmlFor="contractAddress" className="form-label">Contract Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="contractAddress"
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      placeholder="0x..."
                      required
                    />
                    <div className="form-text">Enter the contract address provided by the event organizer.</div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="merkleProof" className="form-label">Your Merkle Proof</label>
                    <textarea
                      className="form-control"
                      id="merkleProof"
                      value={merkleProof}
                      onChange={(e) => setMerkleProof(e.target.value)}
                      placeholder='["0x123...", "0x456..."]'
                      rows={4}
                      required
                    ></textarea>
                    <div className="form-text">
                      <strong>Important:</strong> Enter the Merkle proof specifically for YOUR wallet address ({account}).
                      The organizer should have provided a JSON file with proofs for each participant.
                      Find your address in that file and copy the corresponding proof array.
                      <br />
                      <strong>Format:</strong> Should be a JSON array like: ["0x123...", "0x456..."]
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !account}
                  >
                    {loading ? 'Verifying...' : 'Verify Eligibility'}
                  </button>
                </form>

                <div className="mt-4">
                  <div className="alert alert-info">
                    <h6>Need Help?</h6>
                    <p className="mb-2"><strong>Common Issues:</strong></p>
                    <ul className="mb-2">
                      <li>Make sure your wallet address was included in the original participant list</li>
                      <li>Use the Merkle proof specifically for your address, not someone else's</li>
                      <li>Check that the JSON format is correct (array of hex strings)</li>
                      <li>Verify you're connected to the correct network (Sepolia testnet)</li>
                    </ul>
                    <p className="mb-0">
                      <strong>Expected Merkle Proof Format:</strong><br />
                      <code>["0x1234...", "0x5678...", "0x9abc..."]</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Step 2: Claim Certificate */}
            <div className={`card mb-4 ${step !== 2 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">🔗 Step 2: Claim Your Soulbound Certificate</h4>
                <p className="mb-0 mt-1"><small>This certificate will be permanently bound to your wallet address</small></p>
              </div>
              <div className="card-body">
                {eventDetails && (
                  <div className="mb-4">
                    <h5 className="card-title">{eventDetails.eventName}</h5>
                    <p className="card-text">{eventDetails.eventDescription}</p>
                    <p className="card-text"><small className="text-muted">Date: {eventDetails.eventDate}</small></p>
                  </div>
                )}
                
                <form onSubmit={handleClaimCertificate}>
                  <div className="mb-3">
                    <label htmlFor="tokenURI" className="form-label">Token URI (IPFS or other metadata link)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="tokenURI"
                      value={tokenURI}
                      onChange={(e) => setTokenURI(e.target.value)}
                      placeholder="ipfs://..."
                      required
                    />
                    <div className="form-text">Enter the token URI for your certificate metadata.</div>
                  </div>
                  
                  <div className="d-flex justify-content-between">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading || !isEligible || hasClaimed}
                    >
                      {loading ? 'Claiming...' : 'Claim Certificate'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            {/* Step 3: Success */}
            <div className={`card mb-4 ${step !== 3 ? 'd-none' : ''}`}>
              <div className="card-header bg-success text-white">
                <h4 className="mb-0">🔗 Soulbound Certificate Claimed Successfully!</h4>
                <p className="mb-0 mt-1"><small>Your certificate is now permanently bound to your wallet</small></p>
              </div>
              <div className="card-body text-center">
                <div className="mb-4">
                  <div className="display-1 text-success mb-3">🎉</div>
                  <h5>Congratulations!</h5>
                  <p>Your <strong>Soulbound Certificate</strong> has been minted and permanently bound to your wallet.</p>
                  <div className="alert alert-info mt-3">
                    <h6>🔗 What makes this special?</h6>
                    <ul className="mb-0">
                      <li><strong>Non-transferable</strong> - Cannot be sold or moved to another wallet</li>
                      <li><strong>Permanently yours</strong> - Immutable proof of your achievement</li>
                      <li><strong>Tamper-proof</strong> - Secured by blockchain technology</li>
                      <li><strong>Verifiable</strong> - Anyone can verify its authenticity</li>
                    </ul>
                  </div>
                </div>
                
                <div className="d-grid gap-2 col-md-8 mx-auto mb-4">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => addCertificateToMetaMask({
                      contractAddress: contractAddress,
                      tokenId: '1', // Will be updated with actual token ID
                      contractName: eventDetails?.name || 'Certificate',
                      contractSymbol: eventDetails?.symbol || 'CERT'
                    })}
                  >
                    🦊 Add Certificate to MetaMask
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setShowViewer(true);
                      setViewerContractAddress(contractAddress);
                    }}
                  >
                    👀 View My Certificates
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setStep(1);
                      setContractAddress('');
                      setMerkleProof('');
                      setTokenURI('');
                      setIsEligible(false);
                      setHasClaimed(false);
                      setEventDetails(null);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Claim Another Certificate
                  </button>
                </div>
              </div>
            </div>
            
            {/* Error and success messages */}
            {error && (
              <div className="alert alert-danger mt-3">
                {error}
              </div>
            )}
            
            {successMsg && step !== 3 && (
              <div className="alert alert-success mt-3">
                {successMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certificate Viewer Section */}
      {account && showViewer && (
        <div className="row">
          <div className="col-lg-10 mx-auto">
            {/* Certificate Viewer */}
            <div className="card mb-4">
              <div className="card-header bg-success text-white">
                <h4 className="mb-0">🔗 My Soulbound Certificates</h4>
                <p className="mb-0 mt-1"><small>View your non-transferable certificates bound to this wallet</small></p>
              </div>
              <div className="card-body">
                <form onSubmit={handleViewCertificates} className="mb-4">
                  <div className="mb-3">
                    <label htmlFor="viewerContractAddress" className="form-label">Contract Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="viewerContractAddress"
                      value={viewerContractAddress}
                      onChange={(e) => setViewerContractAddress(e.target.value)}
                      placeholder="0x..."
                      required
                    />
                    <div className="form-text">Enter the contract address to check for your certificates.</div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loadingCertificates || !account}
                  >
                    {loadingCertificates ? 'Searching...' : 'View My Certificates'}
                  </button>
                </form>

                {/* Display Certificates */}
                {myCertificates.length > 0 && (
                  <div className="certificates-display">
                    <h5 className="mb-3">Your Soulbound Certificates:</h5>
                    {myCertificates.map((cert, index) => (
                      <div key={index} className="card mb-3 border-success">
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-8">
                              <h5 className="card-title">
                                🔗 {cert.metadata.name || cert.contractName}
                              </h5>
                              <p className="card-text">
                                {cert.metadata.description || 'Soulbound Certificate'}
                              </p>
                              <div className="certificate-details">
                                <p className="mb-1"><strong>Contract:</strong> {cert.contractName} ({cert.contractSymbol})</p>
                                <p className="mb-1"><strong>Token ID:</strong> {cert.tokenId}</p>
                                <p className="mb-1"><strong>Contract Address:</strong>
                                  <code className="ms-2">{cert.contractAddress}</code>
                                </p>
                                <p className="mb-1"><strong>Metadata URI:</strong>
                                  <a href={cert.uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="ms-2">
                                    View on IPFS
                                  </a>
                                </p>
                              </div>

                              <div className="alert alert-success mt-3">
                                <h6>🔗 Soulbound Properties:</h6>
                                <ul className="mb-0">
                                  <li>✅ <strong>Permanently bound</strong> to your wallet</li>
                                  <li>🚫 <strong>Non-transferable</strong> - cannot be sold or moved</li>
                                  <li>🔒 <strong>Tamper-proof</strong> - secured by blockchain</li>
                                  <li>✅ <strong>Verifiable</strong> - anyone can verify authenticity</li>
                                </ul>
                              </div>
                            </div>

                            <div className="col-md-4 text-center">
                              {cert.metadata.image && (
                                <img
                                  src={cert.metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                                  alt="Certificate"
                                  className="img-fluid rounded border"
                                  style={{maxHeight: '200px'}}
                                />
                              )}

                              <div className="mt-3 d-grid gap-2">
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => addCertificateToMetaMask(cert)}
                                >
                                  🦊 Add to MetaMask NFTs
                                </button>

                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => verifyCertificateInMetaMaskLocal(cert)}
                                >
                                  ✅ Verify in MetaMask
                                </button>

                                <button
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => addContractToMetaMask(cert.contractAddress, cert.contractName, cert.contractSymbol)}
                                >
                                  🔗 Monitor Contract
                                </button>

                                <div className="btn-group w-100" role="group">
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => {
                                      const contractUrl = `https://sepolia.etherscan.io/address/${cert.contractAddress}#readContract`;
                                      window.open(contractUrl, '_blank');
                                    }}
                                  >
                                    🔍 Verify Ownership
                                  </button>
                                  <button
                                    className="btn btn-outline-info btn-sm"
                                    onClick={() => {
                                      const tokenUrl = `https://sepolia.etherscan.io/token/${cert.contractAddress}?a=${cert.tokenId}`;
                                      window.open(tokenUrl, '_blank');
                                    }}
                                  >
                                    📊 Token Details
                                  </button>
                                </div>

                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cert.contractAddress);
                                    alert('Contract address copied to clipboard!');
                                  }}
                                >
                                  📋 Copy Address
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {myCertificates.length === 0 && viewerContractAddress && !loadingCertificates && (
                  <div className="alert alert-info">
                    <h6>No certificates found</h6>
                    <p className="mb-0">You don't have any soulbound certificates from this contract address.</p>
                  </div>
                )}

                {/* Comprehensive Verification Guide */}
                <div className="alert alert-info mt-4">
                  <h6>🔍 How to Verify Your Soulbound Certificate Ownership</h6>

                  <div className="row mt-3">
                    <div className="col-md-6">
                      <h6>🎯 Method 1: Use Our Verification (Easiest)</h6>
                      <ol className="small">
                        <li>Click <strong>"✅ Verify Certificate"</strong> button above</li>
                        <li>Automatically checks blockchain ownership</li>
                        <li>Shows detailed verification results</li>
                        <li>Most reliable and user-friendly method</li>
                      </ol>
                    </div>

                    <div className="col-md-6">
                      <h6>🔍 Method 2: Etherscan Verification (Most Trusted)</h6>
                      <ol className="small">
                        <li>Click <strong>"🔍 Verify Ownership"</strong> button above</li>
                        <li>Goes to Etherscan contract "Read Contract" tab</li>
                        <li>Use <code>hasSoulboundCertificate</code> with your address</li>
                        <li>Should return <code>true</code> if you own it</li>
                      </ol>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h6>❓ Why Etherscan Shows "0 Holders"</h6>
                    <p className="small mb-2">
                      <strong>This is normal for soulbound certificates!</strong> Etherscan counts "holders" based on transfer events,
                      but soulbound certificates don't use transfers - they're directly minted to recipients.
                      The certificate still exists and is bound to your wallet.
                    </p>

                    <h6>✅ Proof of Ownership Methods</h6>
                    <ul className="small mb-0">
                      <li><strong>Smart Contract Functions:</strong> Use <code>hasSoulboundCertificate(your_address)</code> → returns <code>true</code></li>
                      <li><strong>Token Ownership:</strong> Use <code>soulboundOwnerOf(token_id)</code> → returns your address</li>
                      <li><strong>Certificate Details:</strong> Use <code>getSoulboundCertificateDetails(your_address)</code> → returns certificate info</li>
                      <li><strong>Transaction History:</strong> Look for your claiming transaction with "SoulboundCertificateIssued" event</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortal; 