import React, { useState } from 'react';
import { ethers } from 'ethers';

const CertificateVerifier = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [tokenId, setTokenId] = useState('1');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Contract ABI for verification functions
  const contractABI = [
    "function hasSoulboundCertificate(address) view returns (bool)",
    "function soulboundOwnerOf(uint256) view returns (address)",
    "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
    "function tokenURI(uint256) view returns (string)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
  ];

  const verifyOwnership = async () => {
    if (!contractAddress || !walletAddress) {
      setError('Please enter both contract address and wallet address');
      return;
    }

    if (!ethers.utils.isAddress(contractAddress) || !ethers.utils.isAddress(walletAddress)) {
      setError('Please enter valid Ethereum addresses');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      // Connect to Sepolia network via backend API
      const response = await fetch('/api/network/provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: 'sepolia'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get network provider');
      }

      const providerData = await response.json();
      const provider = new ethers.providers.JsonRpcProvider(providerData.rpcUrl);

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Get contract information
      const [contractName, contractSymbol, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(), 
        contract.totalSupply()
      ]);

      // Verify ownership
      const hasCertificate = await contract.hasSoulboundCertificate(walletAddress);
      const balance = await contract.balanceOf(walletAddress);

      let ownershipDetails = null;
      let metadata = null;

      if (hasCertificate) {
        // Get certificate details
        const [exists, certTokenId, uri] = await contract.getSoulboundCertificateDetails(walletAddress);
        
        // Verify token ownership
        const tokenOwner = await contract.soulboundOwnerOf(certTokenId);
        
        ownershipDetails = {
          exists,
          tokenId: certTokenId.toString(),
          uri,
          owner: tokenOwner,
          isCorrectOwner: tokenOwner.toLowerCase() === walletAddress.toLowerCase()
        };

        // Fetch metadata from IPFS
        if (uri.startsWith('ipfs://')) {
          try {
            const ipfsHash = uri.replace('ipfs://', '');
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
            metadata = await response.json();
          } catch (metadataError) {
            console.error('Error fetching metadata:', metadataError);
          }
        }
      }

      setVerificationResult({
        contractInfo: {
          name: contractName,
          symbol: contractSymbol,
          totalSupply: totalSupply.toString(),
          address: contractAddress
        },
        walletInfo: {
          address: walletAddress,
          hasCertificate,
          balance: balance.toString()
        },
        ownershipDetails,
        metadata,
        verifiedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Verification error:', error);
      setError(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyVerificationLink = () => {
    const verificationUrl = `${window.location.origin}/verify?contract=${contractAddress}&wallet=${walletAddress}`;
    navigator.clipboard.writeText(verificationUrl);
    alert('Verification link copied to clipboard!');
  };

  return (
    <div className="certificate-verifier">
      <div className="card">
        <div className="card-header bg-info text-white">
          <h4 className="mb-0">🔍 Public Certificate Verification</h4>
          <p className="mb-0 mt-1"><small>Verify if a soulbound certificate belongs to a specific wallet</small></p>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <h6>🌐 Public Verification Tool</h6>
            <p className="mb-0">
              Anyone can use this tool to verify certificate ownership. No wallet connection required - 
              just enter the contract address and wallet address to verify.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); verifyOwnership(); }}>
            <div className="mb-3">
              <label htmlFor="contractAddress" className="form-label">Certificate Contract Address</label>
              <input
                type="text"
                className="form-control"
                id="contractAddress"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                required
              />
              <div className="form-text">Enter the soulbound certificate contract address</div>
            </div>

            <div className="mb-3">
              <label htmlFor="walletAddress" className="form-label">Wallet Address to Verify</label>
              <input
                type="text"
                className="form-control"
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                required
              />
              <div className="form-text">Enter the wallet address you want to verify certificate ownership for</div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Verifying...' : '🔍 Verify Certificate Ownership'}
            </button>
          </form>

          {error && (
            <div className="alert alert-danger mt-3">
              <h6>❌ Verification Error</h6>
              <p className="mb-0">{error}</p>
            </div>
          )}

          {verificationResult && (
            <div className="mt-4">
              <div className={`alert ${verificationResult.walletInfo.hasCertificate ? 'alert-success' : 'alert-warning'}`}>
                <h5>
                  {verificationResult.walletInfo.hasCertificate ? '✅ Certificate Verified!' : '❌ No Certificate Found'}
                </h5>
                <p className="mb-0">
                  {verificationResult.walletInfo.hasCertificate 
                    ? 'This wallet owns a valid soulbound certificate from this contract.'
                    : 'This wallet does not own any certificates from this contract.'
                  }
                </p>
              </div>

              {/* Contract Information */}
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">📄 Contract Information</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Name:</strong> {verificationResult.contractInfo.name}</p>
                      <p><strong>Symbol:</strong> {verificationResult.contractInfo.symbol}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Total Certificates:</strong> {verificationResult.contractInfo.totalSupply}</p>
                      <p><strong>Contract:</strong> <code>{verificationResult.contractInfo.address}</code></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Information */}
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">👤 Wallet Verification</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Wallet Address:</strong> <code>{verificationResult.walletInfo.address}</code></p>
                      <p><strong>Has Certificate:</strong> 
                        <span className={`ms-2 badge ${verificationResult.walletInfo.hasCertificate ? 'bg-success' : 'bg-danger'}`}>
                          {verificationResult.walletInfo.hasCertificate ? 'YES' : 'NO'}
                        </span>
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Certificate Count:</strong> {verificationResult.walletInfo.balance}</p>
                      <p><strong>Verified At:</strong> {new Date(verificationResult.verifiedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              {verificationResult.ownershipDetails && (
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">🔗 Certificate Details</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-8">
                        <p><strong>Token ID:</strong> {verificationResult.ownershipDetails.tokenId}</p>
                        <p><strong>Metadata URI:</strong> 
                          <a href={verificationResult.ownershipDetails.uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="ms-2">
                            View on IPFS
                          </a>
                        </p>
                        <p><strong>Blockchain Owner:</strong> <code>{verificationResult.ownershipDetails.owner}</code></p>
                        <p><strong>Ownership Match:</strong> 
                          <span className={`ms-2 badge ${verificationResult.ownershipDetails.isCorrectOwner ? 'bg-success' : 'bg-danger'}`}>
                            {verificationResult.ownershipDetails.isCorrectOwner ? 'VERIFIED' : 'MISMATCH'}
                          </span>
                        </p>
                      </div>
                      <div className="col-md-4">
                        {verificationResult.metadata?.image && (
                          <img 
                            src={verificationResult.metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                            alt="Certificate" 
                            className="img-fluid rounded border"
                            style={{maxHeight: '150px'}}
                          />
                        )}
                      </div>
                    </div>
                    
                    {verificationResult.metadata && (
                      <div className="mt-3">
                        <h6>📋 Certificate Metadata:</h6>
                        <p><strong>Name:</strong> {verificationResult.metadata.name}</p>
                        <p><strong>Description:</strong> {verificationResult.metadata.description}</p>
                        {verificationResult.metadata.attributes && (
                          <div>
                            <strong>Attributes:</strong>
                            <ul className="mt-2">
                              {verificationResult.metadata.attributes.map((attr, index) => (
                                <li key={index}><strong>{attr.trait_type}:</strong> {attr.value}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verification Actions */}
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">🔗 Share Verification</h6>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-outline-primary"
                      onClick={copyVerificationLink}
                    >
                      📋 Copy Verification Link
                    </button>
                    
                    <a 
                      href={`https://sepolia.etherscan.io/address/${contractAddress}#readContract`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-info"
                    >
                      🔍 Verify on Etherscan
                    </a>
                  </div>
                  
                  <div className="alert alert-info mt-3">
                    <h6>🌐 Public Verification</h6>
                    <p className="mb-0">
                      This verification is performed directly on the blockchain and can be independently 
                      verified by anyone. The results are tamper-proof and immutable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateVerifier;
