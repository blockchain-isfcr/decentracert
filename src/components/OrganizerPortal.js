import { useState } from 'react';
import { generateAllMerkleProofs } from '../utils/merkleUtils';
import { deployCertificateContractOptimized, deployCertificateContractUltraLow, updateMerkleRoot, updateEventDetails } from '../utils/contractUtils';
import AnalyticsDashboard from './AnalyticsDashboard';
import AICertificateGenerator from './AICertificateGenerator';
import { ethers } from 'ethers';
import FormData from 'form-data';

const OrganizerPortal = ({ account, provider, signer, connectWallet }) => {

  // Verify if a contract was deployed successfully
  const verifyContractDeployment = async (contractAddress) => {
    try {
      if (!provider || !contractAddress) return false;

      const code = await provider.getCode(contractAddress);
      return code !== '0x'; // Contract exists if it has code
    } catch (error) {
      console.error('Error verifying contract:', error);
      return false;
    }
  };

  // Check current gas prices
  const checkGasPrices = async () => {
    try {
      if (provider) {
        const gasPrice = await provider.getGasPrice();
        const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));
        setCurrentGasPrice(gasPriceGwei);
        return gasPriceGwei;
      }
    } catch (error) {
      console.error('Error checking gas prices:', error);
    }
    return null;
  };

  // Manual contract check function
  const handleManualContractCheck = async (addressToCheck) => {
    if (!addressToCheck || !ethers.utils.isAddress(addressToCheck)) {
      setError('Please enter a valid contract address');
      return;
    }

    setCheckingContract(true);
    setError('');

    try {
      const exists = await verifyContractDeployment(addressToCheck);

      if (exists) {
        setDeployedContract(addressToCheck);
        setSuccessMsg(`✅ Contract verified successfully at ${addressToCheck}!

The contract is deployed and working. You can proceed with certificate distribution.`);
        setStep(5);
      } else {
        setError(`❌ No contract found at ${addressToCheck}. Please check the address or try deploying again.`);
      }
    } catch (error) {
      setError(`Error checking contract: ${error.message}`);
    } finally {
      setCheckingContract(false);
    }
  };
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventSymbol, setEventSymbol] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [addresses, setAddresses] = useState('');
  const [certificateImage, setCertificateImage] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [checkingContract, setCheckingContract] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState('balanced'); // 'balanced' or 'cheap'
  const [currentGasPrice, setCurrentGasPrice] = useState(null);
  const [merkleRoot, setMerkleRoot] = useState('');
  const [deployedContract, setDeployedContract] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState(1);
  const [merkleProofs, setMerkleProofs] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageHash, setUploadedImageHash] = useState('');
  const [metadataHash, setMetadataHash] = useState('');

  // New features state
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'analytics', 'ai-generator'
  const [analyticsContractAddress, setAnalyticsContractAddress] = useState('');

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCertificateImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to IPFS via backend API
  const uploadImageToPinata = async () => {
    if (!certificateImage) {
      throw new Error('Please select a certificate image');
    }

    const formData = new FormData();
    formData.append('file', certificateImage);
    
    const metadata = {
      name: `${eventName}-certificate-image`,
    };
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/upload-ipfs', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload to IPFS');
    }

    const result = await response.json();
    return result.ipfsHash;
  };

  // Upload metadata to IPFS via backend API
  const uploadMetadataToPinata = async (imageHash) => {
    const metadata = {
      name: eventName,
      description: eventDescription,
      image: `https://gateway.pinata.cloud/ipfs/${imageHash}`, // Use gateway URL for MetaMask compatibility
      external_url: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
      attributes: [
        {
          trait_type: "Event",
          value: eventName
        },
        {
          trait_type: "Date",
          value: eventDate
        },
        {
          trait_type: "Issuer",
          value: account
        },
        {
          trait_type: "Certificate Type",
          value: "Soulbound"
        }
      ]
    };

    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
    }

    const result = await response.json();
    return result.ipfsHash;
  };

  // Handle form submission for event details and addresses
  const handleCreateMerkleRoot = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Parse addresses
      const addressList = addresses.split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr !== '');
      
      if (addressList.length === 0) {
        throw new Error('Please enter at least one address.');
      }

      // Generate Merkle tree and proofs
      const { merkleRoot: root, proofs } = generateAllMerkleProofs(addressList);

      setMerkleRoot(root);
      setMerkleProofs(proofs);

      // Auto-download the Merkle proofs JSON file
      setTimeout(() => {
        const jsonData = JSON.stringify({ merkleRoot: root, proofs }, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `merkle-proofs-${eventName || 'event'}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 500); // Small delay to ensure state is updated

      setSuccessMsg('Merkle root and proofs generated and downloaded successfully!');

      // If AI certificate is already generated (has uploadedImageHash), skip to step 4 (deploy)
      if (uploadedImageHash && metadataHash) {
        setStep(4);
        setSuccessMsg(prevMsg => prevMsg + '\n\n🚀 Ready to deploy contract! All steps completed.');
      } else {
        setStep(2); // Go to image upload step
      }
    } catch (error) {
      console.error('Error generating Merkle root:', error);
      setError('Failed to generate Merkle root: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle uploading image and metadata to IPFS
  const handleUploadToIPFS = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!certificateImage) {
      setError('Please select a certificate image.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Upload image to IPFS
      const imageHash = await uploadImageToPinata();
      setUploadedImageHash(imageHash);
      
      // Upload metadata to IPFS
      const metadataHash = await uploadMetadataToPinata(imageHash);
      setMetadataHash(metadataHash);

      console.log('✅ Regular Upload Complete:');
      console.log('- Image Hash:', imageHash);
      console.log('- Metadata Hash:', metadataHash);
      console.log('- Gateway URL:', `https://gateway.pinata.cloud/ipfs/${imageHash}`);

      // Auto-download the token URI file
      setTimeout(() => {
        const tokenURI = `ipfs://${metadataHash}`;
        const tokenData = {
          tokenURI: tokenURI,
          imageHash: imageHash,
          metadataHash: metadataHash,
          eventDetails: {
            name: eventName,
            symbol: eventSymbol,
            description: eventDescription,
            date: eventDate
          },
          uploadedAt: new Date().toISOString()
        };

        const jsonData = JSON.stringify(tokenData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `token-uri-${eventName || 'event'}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 500);

      setSuccessMsg(`Image and metadata uploaded to IPFS and token URI downloaded successfully!`);
      setStep(4);
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      setError('Failed to upload to IPFS: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle deploying the contract
  const handleDeployContract = async (e) => {
    e.preventDefault();

    if (!account || !signer) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!merkleRoot) {
      setError('Please generate a Merkle root first.');
      return;
    }

    if (!uploadedImageHash) {
      setError('Please upload a certificate image first.');
      return;
    }

    // Validate required fields
    if (!eventName.trim()) {
      setError('Please enter an event name.');
      return;
    }

    if (!eventSymbol.trim()) {
      setError('Please enter an event symbol.');
      return;
    }

    if (!eventDescription.trim()) {
      setError('Please enter an event description.');
      return;
    }

    if (!eventDate) {
      setError('Please select an event date.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      console.log('Starting deployment process...');

      // Prepare event details
      const eventDetails = {
        name: eventName.trim(),
        symbol: eventSymbol.trim().toUpperCase(),
        eventName: eventName.trim(),
        eventDescription: eventDescription.trim(),
        eventDate: eventDate,
        eventImageURI: `ipfs://${uploadedImageHash}`
      };

      console.log('Prepared event details:', eventDetails);

      // Deploy contract with selected mode
      console.log(`🚀 Starting contract deployment in ${deploymentMode} mode...`);
      const contract = deploymentMode === 'cheap'
        ? await deployCertificateContractUltraLow(eventDetails, merkleRoot, signer)
        : await deployCertificateContractOptimized(eventDetails, merkleRoot, signer);

      console.log('✅ Contract deployed successfully!');
      console.log('Contract address:', contract.address);
      console.log('Deployment transaction:', contract.deployTransaction?.hash);

      setDeployedContract(contract.address);

      // Auto-download comprehensive certificate data file
      setTimeout(() => {
        const certificateData = {
          eventDetails: {
            name: eventDetails.name,
            symbol: eventDetails.symbol,
            description: eventDetails.description,
            date: eventDetails.date
          },
          blockchain: {
            network: "Sepolia Testnet",
            contractAddress: contract.address,
            merkleRoot: merkleRoot,
            deployedAt: new Date().toISOString(),
            deploymentTxHash: contract.deployTransaction?.hash || 'N/A'
          },
          ipfs: {
            tokenURI: `ipfs://${metadataHash}`,
            imageHash: uploadedImageHash,
            metadataHash: metadataHash
          },
          merkleProofs: merkleProofs,
          instructions: {
            forOrganizers: [
              "1. Share the contract address with participants",
              "2. Distribute the Merkle proofs to eligible participants",
              "3. Participants can claim certificates using the Student Portal"
            ],
            forStudents: [
              "1. Go to Student Portal",
              "2. Enter the contract address",
              "3. Find your address in merkleProofs section",
              "4. Copy your specific proof array (e.g., [\"0x123...\", \"0x456...\"])",
              "5. Paste the proof array in Student Portal",
              "6. Verify eligibility and claim certificate"
            ]
          },
          generatedAt: new Date().toISOString()
        };

        const jsonData = JSON.stringify(certificateData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `certificate-complete-${eventName || 'event'}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 1000); // Delay to ensure contract address is set

      setSuccessMsg(`Contract deployed successfully at address ${contract.address}. Complete certificate data downloaded!`);
      setStep(5); // Move to step 5 to show success
    } catch (error) {
      console.error('Error deploying contract:', error);

      // Check if this is a TRANSACTION_REPLACED error with successful deployment
      if (error.code === 'TRANSACTION_REPLACED' && error.replacement && error.replacement.hash) {
        console.log('🔄 Transaction was repriced but may have succeeded');
        console.log('Replacement transaction:', error.replacement);

        // Check if the replacement transaction was successful
        if (error.receipt && error.receipt.status === 1 && error.receipt.contractAddress) {
          console.log('✅ Contract deployed successfully despite repricing!');
          console.log('Contract address:', error.receipt.contractAddress);

          // Double-check that the contract actually exists
          const contractExists = await verifyContractDeployment(error.receipt.contractAddress);
          console.log('Contract verification:', contractExists ? 'EXISTS' : 'NOT FOUND');

          // Treat as successful deployment
          setDeployedContract(error.receipt.contractAddress);

          // Auto-download comprehensive certificate data file
          setTimeout(() => {
            const certificateData = {
              eventDetails: {
                name: eventName.trim(),
                symbol: eventSymbol.trim().toUpperCase(),
                description: eventDescription.trim(),
                date: eventDate
              },
              blockchain: {
                network: "Sepolia Testnet",
                contractAddress: error.receipt.contractAddress,
                merkleRoot: merkleRoot,
                deployedAt: new Date().toISOString(),
                deploymentTxHash: error.replacement.hash || error.receipt.transactionHash
              },
              ipfs: {
                tokenURI: `ipfs://${metadataHash}`,
                imageHash: uploadedImageHash,
                metadataHash: metadataHash
              },
              merkleProofs: merkleProofs,
              instructions: {
                forOrganizers: [
                  "1. Share the contract address with participants",
                  "2. Distribute the Merkle proofs to eligible participants",
                  "3. Participants can claim certificates using the Student Portal"
                ],
                forStudents: [
                  "1. Go to Student Portal",
                  "2. Enter the contract address",
                  "3. Find your address in merkleProofs section",
                  "4. Copy your specific proof array (e.g., [\"0x123...\", \"0x456...\"])",
                  "5. Paste the proof array in Student Portal",
                  "6. Verify eligibility and claim certificate"
                ]
              },
              generatedAt: new Date().toISOString()
            };

            const jsonData = JSON.stringify(certificateData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `certificate-complete-${eventName || 'event'}-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 100);
          }, 1000);

          setSuccessMsg(`✅ Contract deployed successfully at address ${error.receipt.contractAddress}!

🔄 Note: Transaction was repriced during deployment but completed successfully.
📄 Complete certificate data downloaded!`);
          setStep(5);
          return; // Exit the catch block
        }
      }

      // Handle other errors
      let errorMessage = error.message;
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds. You need Sepolia ETH to deploy the contract. Get some from a Sepolia faucet.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected. Please try again and confirm the transaction in MetaMask.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and make sure you\'re connected to Sepolia testnet.';
      } else if (error.code === 'TRANSACTION_REPLACED') {
        errorMessage = 'Transaction was replaced due to gas price changes. Please check your wallet for the transaction status and try again if needed.';
      }

      setError('Failed to deploy contract: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Upload custom metadata to IPFS via backend API
  const uploadCustomMetadataToPinata = async (metadata, eventName) => {
    try {
      const response = await fetch('/api/upload-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
      }

      const result = await response.json();
      return result.ipfsHash;
    } catch (error) {
      console.error('Error uploading custom metadata to IPFS:', error);
      throw error;
    }
  };

  // Upload AI-generated data URL to IPFS via backend API
  const uploadAIImageToPinata = async (dataUrl, eventName) => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('file', blob, `${eventName}-ai-certificate.png`);

      const metadata = {
        name: `${eventName}-ai-certificate-image`,
      };
      formData.append('metadata', JSON.stringify(metadata));

      const uploadResponse = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload AI image to IPFS');
      }

      const result = await uploadResponse.json();
      return result.ipfsHash;
    } catch (error) {
      console.error('Error uploading AI image to IPFS:', error);
      throw error;
    }
  };

  // Handle AI-generated certificate
  const handleAICertificateGenerated = async (certificateData) => {
    console.log('🎯 handleAICertificateGenerated called');
    console.log('📦 Certificate data received:', certificateData);

    try {
      setLoading(true);
      setError('');

      // Validate certificate data structure
      if (!certificateData) {
        throw new Error('No certificate data received');
      }

      if (!certificateData.design || !certificateData.design.imageUrl) {
        throw new Error('No certificate image found in data');
      }

      if (!certificateData.metadata) {
        throw new Error('No certificate metadata found in data');
      }

      console.log('✅ Certificate data validation passed');

      // Auto-fill the form with AI-generated data
      if (certificateData && certificateData.metadata) {
        // Extract event details from certificate_data.event (original data)
        const originalEventData = certificateData.metadata.certificate_data?.event;
        const eventName = originalEventData?.name || certificateData.metadata.name?.replace(' - Certificate', '') || '';
        const eventDescription = originalEventData?.description || '';
        const eventDate = originalEventData?.date || '';
        const eventCategory = originalEventData?.category || 'academic';

        console.log('📝 Extracted event details:');
        console.log('- Event Name:', eventName);
        console.log('- Event Description:', eventDescription);
        console.log('- Event Date:', eventDate);
        console.log('- Event Category:', eventCategory);

        setEventName(eventName);
        setEventDescription(eventDescription);

        // Auto-generate symbol from event name
        const autoSymbol = eventName
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 6) + '-SBT';
        setEventSymbol(autoSymbol);

        // Set date if available
        if (eventDate) {
          setEventDate(eventDate);
        }

        // Upload AI-generated image to IPFS
        console.log('📤 Uploading AI-generated image to IPFS...');
        const imageHash = await uploadAIImageToPinata(certificateData.design.imageUrl, eventName);
        setUploadedImageHash(imageHash);

        // Create metadata with proper IPFS gateway URL for MetaMask compatibility
        console.log('📤 Creating metadata with gateway URL...');
        const metadata = {
          name: eventName,
          description: eventDescription,
          image: `https://gateway.pinata.cloud/ipfs/${imageHash}`, // Use gateway URL instead of ipfs://
          external_url: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
          attributes: [
            {
              trait_type: "Event Name",
              value: eventName
            },
            {
              trait_type: "Event Date",
              value: eventDate || new Date().toISOString().split('T')[0]
            },
            {
              trait_type: "Certificate Type",
              value: "Soulbound"
            },
            {
              trait_type: "Generated By",
              value: "AI Certificate Generator"
            },
            {
              trait_type: "Category",
              value: eventCategory || "Professional Development"
            }
          ]
        };

        // Upload metadata to IPFS
        console.log('📤 Uploading metadata to IPFS...');
        const metadataHash = await uploadCustomMetadataToPinata(metadata, eventName);
        setMetadataHash(metadataHash);

        console.log('✅ AI Certificate Integration Complete:');
        console.log('- Image Hash:', imageHash);
        console.log('- Metadata Hash:', metadataHash);
        console.log('- Image Preview:', certificateData.design.imageUrl.substring(0, 50) + '...');
        console.log('- Gateway URL:', `https://gateway.pinata.cloud/ipfs/${imageHash}`);
        console.log('- Metadata:', metadata);

        // Set image preview to the AI-generated image (data URL)
        setImagePreview(certificateData.design.imageUrl);

        // Show success message
        setSuccessMsg(`🎉 AI certificate generated and uploaded successfully!

✅ Event details auto-filled
✅ Certificate design uploaded to IPFS
✅ Metadata created and uploaded
✅ Ready for participant addresses and deployment

Please proceed to add participant wallet addresses.`);

        // Switch to create tab and go to step 1 (to add addresses)
        setActiveTab('create');
        setStep(1); // Start from step 1 but with pre-filled data
      }
    } catch (error) {
      console.error('❌ Error processing AI certificate:', error);
      console.error('Error details:', error);
      setError('Failed to upload AI certificate to IPFS: ' + error.message);

      // Show user-friendly error message
      alert(`Error processing AI certificate: ${error.message}\n\nPlease try again or check the console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle updating an existing contract
  const handleUpdateContract = async (e) => {
    e.preventDefault();
    
    if (!account || !signer) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!contractAddress) {
      setError('Please enter a contract address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Update Merkle root if provided
      if (merkleRoot) {
        await updateMerkleRoot(contractAddress, merkleRoot, signer);
      }
      
      // Update event details if provided
      if (eventName || eventDescription || eventDate || uploadedImageHash) {
        const eventDetails = {
          eventName: eventName,
          eventDescription: eventDescription,
          eventDate: eventDate,
          eventImageURI: uploadedImageHash ? `ipfs://${uploadedImageHash}` : ''
        };
        
        await updateEventDetails(contractAddress, eventDetails, signer);
      }
      
      setSuccessMsg('Contract updated successfully!');
    } catch (error) {
      console.error('Error updating contract:', error);
      setError('Failed to update contract: ' + error.message);
    } finally {
      setLoading(false);
    }
  };



  // Render JSON data for download (manual backup)
  const renderMerkleProofsJSON = () => {
    if (!merkleProofs || !merkleRoot) return null;

    const jsonData = JSON.stringify({ merkleRoot, proofs: merkleProofs }, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    return (
      <div className="mb-3">
        <a
          href={url}
          download={`merkle-proofs-${Date.now()}.json`}
          className="btn btn-outline-success"
        >
          📥 Download Again
        </a>
      </div>
    );
  };

  return (
    <div className="organizer-portal">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="section-heading mb-0">🏛️ Organizer Portal</h2>
        {account && (
          <div className="btn-group" role="group">
            <button
              className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('create')}
            >
              📝 Create Certificates
            </button>
            <button
              className={`btn ${activeTab === 'analytics' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Analytics Dashboard
            </button>
            <button
              className={`btn ${activeTab === 'ai-generator' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setActiveTab('ai-generator')}
            >
              🤖 AI Certificate Generator
            </button>
          </div>
        )}
      </div>

      {!account && (
        <div className="alert alert-info">
          <p>Please connect your wallet to create and manage certificates.</p>
          <button
            className="btn btn-primary"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* Analytics Dashboard Tab */}
      {account && activeTab === 'analytics' && (
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <h5>📊 Certificate Analytics</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Contract Address for Analytics</label>
                <input
                  type="text"
                  className="form-control"
                  value={analyticsContractAddress}
                  onChange={(e) => setAnalyticsContractAddress(e.target.value)}
                  placeholder="Enter contract address to view analytics..."
                />
              </div>
              {analyticsContractAddress && (
                <small className="text-muted">
                  Analyzing contract: <code>{analyticsContractAddress}</code>
                </small>
              )}
            </div>
          </div>

          {analyticsContractAddress && (
            <AnalyticsDashboard
              contractAddress={analyticsContractAddress}
              provider={provider}
            />
          )}
        </div>
      )}

      {/* AI Certificate Generator Tab */}
      {account && activeTab === 'ai-generator' && (
        <div>
          <AICertificateGenerator onCertificateGenerated={handleAICertificateGenerated} />
        </div>
      )}

      {/* Create Certificates Tab */}
      {account && activeTab === 'create' && (
        <div className="row">
          <div className="col-lg-8 mx-auto">
            {/* Step navigation */}
            <div className="mb-4">
              <div className="progress">
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{width: `${step * 25}%`}}
                  aria-valuenow={step * 25}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  Step {step} of 4
                </div>
              </div>

              <div className="d-flex justify-content-between mt-2">
                <small className={uploadedImageHash ? 'text-success fw-bold' : ''}>
                  {uploadedImageHash ? '✅ Event Details (AI)' : 'Event Details'}
                </small>
                <small className={step >= 2 ? 'text-primary fw-bold' : ''}>Generate Proofs</small>
                <small className={uploadedImageHash ? 'text-success fw-bold' : step >= 3 ? 'text-primary fw-bold' : ''}>
                  {uploadedImageHash ? '✅ AI Assets' : 'Upload Assets'}
                </small>
                <small className={step >= 4 ? 'text-primary fw-bold' : ''}>Deploy Contract</small>
              </div>

              {uploadedImageHash && (
                <div className="mt-2">
                  <small className="text-success">
                    🤖 AI Certificate Generated - Image upload step skipped
                  </small>
                </div>
              )}
            </div>
            
            {/* Step 1: Event Details */}
            <div className={`card mb-4 ${step !== 1 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 1: Event Details & Participant Addresses</h4>
                {uploadedImageHash && (
                  <small className="d-block mt-1">
                    🤖 AI Certificate Generated - Details Pre-filled
                  </small>
                )}
              </div>
              <div className="card-body">
                {/* AI Generated Certificate Preview */}
                {uploadedImageHash && imagePreview && (
                  <div className="alert alert-success mb-4">
                    <div className="row">
                      <div className="col-md-4">
                        <img
                          src={imagePreview}
                          alt="AI Generated Certificate"
                          className="img-fluid rounded border"
                          style={{maxHeight: '150px', objectFit: 'cover'}}
                        />
                      </div>
                      <div className="col-md-8">
                        <h6>🎉 AI Certificate Generated Successfully!</h6>
                        <p className="mb-2">
                          ✅ Certificate design created and uploaded to IPFS<br/>
                          ✅ Event details auto-filled below<br/>
                          ✅ Ready for participant addresses
                        </p>
                        <small className="text-muted">
                          You can modify the details below if needed, then add participant addresses to continue.
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateMerkleRoot}>
                  <div className="mb-3">
                    <label htmlFor="eventName" className="form-label">Event Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="eventName"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g., Blockchain Workshop 2023"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="eventSymbol" className="form-label">Certificate Symbol</label>
                    <input
                      type="text"
                      className="form-control"
                      id="eventSymbol"
                      value={eventSymbol}
                      onChange={(e) => setEventSymbol(e.target.value)}
                      placeholder="e.g., BCW23"
                      required
                    />
                    <div className="form-text">Short symbol for your certificate (like a stock ticker).</div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="eventDescription" className="form-label">Event Description</label>
                    <textarea
                      className="form-control"
                      id="eventDescription"
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Describe the event and what this certificate represents"
                      rows={3}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="eventDate" className="form-label">Event Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="eventDate"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="addresses" className="form-label">Participant Wallet Addresses</label>
                    <textarea
                      className="form-control"
                      id="addresses"
                      value={addresses}
                      onChange={(e) => setAddresses(e.target.value)}
                      placeholder="Enter one Ethereum address per line"
                      rows={5}
                      required
                    ></textarea>
                    <div className="form-text">Enter one Ethereum wallet address per line. These addresses will be eligible to claim the certificate.</div>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Generate Merkle Proofs'}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Step 2: Merkle Proofs */}
            <div className={`card mb-4 ${step !== 2 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 2: Merkle Root & Proofs</h4>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Merkle Root</label>
                  <input
                    type="text"
                    className="form-control"
                    value={merkleRoot}
                    readOnly
                  />
                  <div className="form-text">This Merkle root will be stored in the smart contract.</div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Merkle Proofs</label>
                  <div className="alert alert-success mb-2">
                    <small>✅ <strong>Auto-Downloaded:</strong> merkle-proofs-{eventName || 'event'}-[timestamp].json</small>
                    <br />
                    <small>💡 <strong>Note:</strong> A comprehensive file with all data will be downloaded after contract deployment.</small>
                  </div>
                  {renderMerkleProofsJSON()}
                  <div className="form-text">The Merkle proofs file was automatically downloaded. Distribute these proofs to your participants so they can claim their certificates.</div>
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
                    type="button"
                    className="btn btn-primary"
                    onClick={() => uploadedImageHash && metadataHash ? setStep(4) : setStep(3)}
                  >
                    {uploadedImageHash && metadataHash ? 'Next: Deploy Contract' : 'Next: Upload Certificate Image'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Step 3: Upload Certificate Image */}
            <div className={`card mb-4 ${step !== 3 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 3: Upload Certificate Image</h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleUploadToIPFS}>
                  <div className="mb-3">
                    <label htmlFor="certificateImage" className="form-label">Certificate Image</label>
                    <input
                      type="file"
                      className="form-control"
                      id="certificateImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      required
                    />
                    <div className="form-text">Upload an image of the certificate template.</div>
                  </div>
                  
                  {imagePreview && (
                    <div className="mb-3">
                      <label className="form-label">Preview</label>
                      <div className="border p-2 text-center">
                        <img 
                          src={imagePreview} 
                          alt="Certificate Preview" 
                          className="img-fluid" 
                          style={{ maxHeight: '300px' }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-between">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading || !certificateImage}
                    >
                      {loading ? 'Uploading...' : 'Upload to IPFS'}
                    </button>
                  </div>
                </form>
                
                {uploadedImageHash && (
                  <div className="mt-3">
                    <div className="alert alert-success">
                      <p className="mb-1"><strong>Image IPFS Hash:</strong> {uploadedImageHash}</p>
                      <p className="mb-1"><strong>Metadata IPFS Hash:</strong> {metadataHash}</p>
                      <p className="mb-1"><strong>Token URI:</strong> ipfs://{metadataHash}</p>
                      <p className="mb-1"><small>✅ <strong>Auto-Downloaded:</strong> token-uri-{eventName || 'event'}-[timestamp].json</small></p>
                      <p className="mb-0"><small>💡 <strong>Note:</strong> A comprehensive file with all data will be downloaded after contract deployment.</small></p>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        type="button"
                        className="btn btn-outline-info"
                        onClick={() => {
                          const tokenURI = `ipfs://${metadataHash}`;
                          const tokenData = {
                            tokenURI: tokenURI,
                            imageHash: uploadedImageHash,
                            metadataHash: metadataHash,
                            eventDetails: {
                              name: eventName,
                              symbol: eventSymbol,
                              description: eventDescription,
                              date: eventDate
                            },
                            uploadedAt: new Date().toISOString()
                          };

                          const jsonData = JSON.stringify(tokenData, null, 2);
                          const blob = new Blob([jsonData], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);

                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `token-uri-${eventName || 'event'}-${Date.now()}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);

                          setTimeout(() => URL.revokeObjectURL(url), 100);
                        }}
                      >
                        📥 Download Token URI Again
                      </button>

                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => setStep(4)}
                      >
                        Next: Deploy Contract
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 4: Deploy Contract */}
            <div className={`card mb-4 ${step !== 4 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 4: Deploy Contract</h4>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <h5>Deploy New Contract</h5>
                  <p>Deploy a new certificate contract with the provided event details and Merkle root.</p>

                  <div className="alert alert-success mb-3">
                    <h6>🔗 Soulbound Certificate NFTs - Revolutionary!</h6>
                    <p className="mb-1">Deploy <strong>Soulbound Certificates</strong> that cost approximately <strong>~100 INR only</strong> and work with <strong>ANY number of addresses</strong>:</p>
                    <ul className="mb-1">
                      <li>🔗 <strong>Soulbound Technology</strong> - Certificates permanently bound to recipients</li>
                      <li>🚫 <strong>Non-transferable</strong> - Cannot be sold, traded, or moved</li>
                      <li>✅ <strong>Tamper-proof authenticity</strong> - Immutable proof of achievement</li>
                      <li>✅ Ultra-low deployment cost (~100 INR instead of 1200 INR)</li>
                      <li>✅ <strong>Universal compatibility</strong> - works with 1, 2, or 1000+ addresses</li>
                      <li>✅ Academic integrity preserved - no certificate marketplace</li>
                      <li>✅ Future-proof design following latest Web3 standards</li>
                    </ul>
                    <p className="mb-0"><small>🎓 Perfect for academic credentials, professional certifications, and achievement records!</small></p>
                  </div>

                  {/* Gas Price Info */}
                  {currentGasPrice && (
                    <div className="alert alert-info mb-3">
                      <small>
                        <strong>Current Network Gas Price:</strong> {currentGasPrice.toFixed(2)} gwei
                        {currentGasPrice < 2 && <span className="text-success"> • Very Low (Great time to deploy!)</span>}
                        {currentGasPrice >= 2 && currentGasPrice < 5 && <span className="text-warning"> • Moderate</span>}
                        {currentGasPrice >= 5 && <span className="text-danger"> • High (Consider waiting)</span>}
                      </small>
                    </div>
                  )}

                  {/* Deployment Mode Selection */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <label className="form-label mb-0">⛽ Deployment Mode</label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info"
                        onClick={checkGasPrices}
                      >
                        🔍 Check Gas Prices
                      </button>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="deploymentMode"
                            id="balancedMode"
                            value="balanced"
                            checked={deploymentMode === 'balanced'}
                            onChange={(e) => setDeploymentMode(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="balancedMode">
                            <strong>🚀 Balanced (Recommended)</strong><br />
                            <small className="text-muted">~100-150 INR • 1-3 minutes • Reliable</small>
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="deploymentMode"
                            id="cheapMode"
                            value="cheap"
                            checked={deploymentMode === 'cheap'}
                            onChange={(e) => setDeploymentMode(e.target.value)}
                          />
                          <label className="form-check-label" htmlFor="cheapMode">
                            <strong>🐌 Ultra Cheap</strong><br />
                            <small className="text-muted">~50-80 INR • 5-15 minutes • May be slow</small>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-success"
                    onClick={handleDeployContract}
                    disabled={loading || !merkleRoot || !uploadedImageHash}
                  >
                    {loading ? 'Deploying...' : `Deploy Soulbound Certificate Contract (${deploymentMode === 'cheap' ? '~50-80 INR' : '~100-150 INR'})`}
                  </button>
                </div>
                
                <hr className="my-4" />
                
                <div className="mb-3">
                  <h5>Update Existing Contract</h5>
                  <form onSubmit={handleUpdateContract}>
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
                    </div>
                    
                    <button 
                      type="submit" 
                      className="btn btn-warning"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Contract'}
                    </button>
                  </form>
                </div>
                
                <div className="d-flex justify-content-between mt-4">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setStep(3)}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
            
            {/* Step 5: Deployed Contract Info */}
            <div className={`card mb-4 ${step !== 5 ? 'd-none' : ''}`}>
              <div className="card-header bg-success text-white">
                <h4 className="mb-0">Step 5: Contract Deployed Successfully!</h4>
              </div>
              <div className="card-body">
                  <div className="alert alert-success mb-3">
                    <h5 className="mb-2">🎉 Certificate System Ready!</h5>
                    <p className="mb-1">✅ <strong>Auto-Downloaded:</strong> certificate-complete-{eventName || 'event'}-[timestamp].json</p>
                    <p className="mb-0">This file contains everything you need: contract address, Merkle root, proofs, token URI, and instructions.</p>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Contract Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={deployedContract}
                        readOnly
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Merkle Root</label>
                      <input
                        type="text"
                        className="form-control"
                        value={merkleRoot}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Token URI</label>
                    <input
                      type="text"
                      className="form-control"
                      value={metadataHash ? `ipfs://${metadataHash}` : ''}
                      readOnly
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const certificateData = {
                          eventDetails: {
                            name: eventName,
                            symbol: eventSymbol,
                            description: eventDescription,
                            date: eventDate
                          },
                          blockchain: {
                            network: "Sepolia Testnet",
                            contractAddress: deployedContract,
                            merkleRoot: merkleRoot,
                            deployedAt: new Date().toISOString()
                          },
                          ipfs: {
                            tokenURI: `ipfs://${metadataHash}`,
                            imageHash: uploadedImageHash,
                            metadataHash: metadataHash
                          },
                          merkleProofs: merkleProofs,
                          instructions: {
                            forOrganizers: [
                              "1. Share the contract address with participants",
                              "2. Distribute the Merkle proofs to eligible participants",
                              "3. Participants can claim certificates using the Student Portal"
                            ],
                            forStudents: [
                              "1. Go to Student Portal",
                              "2. Enter the contract address",
                              "3. Find your address in merkleProofs section",
                              "4. Copy your specific proof array (e.g., [\"0x123...\", \"0x456...\"])",
                              "5. Paste the proof array in Student Portal",
                              "6. Verify eligibility and claim certificate"
                            ]
                          },
                          generatedAt: new Date().toISOString()
                        };

                        const jsonData = JSON.stringify(certificateData, null, 2);
                        const blob = new Blob([jsonData], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);

                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `certificate-complete-${eventName || 'event'}-${Date.now()}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        setTimeout(() => URL.revokeObjectURL(url), 100);
                      }}
                    >
                      📥 Download Complete Certificate Data Again
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setStep(1);
                        // Reset form for new certificate
                        setEventName('');
                        setEventSymbol('');
                        setEventDescription('');
                        setEventDate('');
                        setAddresses('');
                        setMerkleRoot('');
                        setMerkleProofs({});
                        setCertificateImage(null);
                        setImagePreview('');
                        setUploadedImageHash('');
                        setMetadataHash('');
                        setDeployedContract('');
                        setError('');
                        setSuccessMsg('');
                      }}
                    >
                      🆕 Create New Certificate
                    </button>
                  </div>

                  <div className="alert alert-info">
                    <h5>Next Steps:</h5>
                    <ol className="mb-2">
                      <li><strong>Share the contract address</strong> ({deployedContract}) with your participants.</li>
                      <li><strong>Distribute the complete certificate data file</strong> or individual Merkle proofs to eligible participants.</li>
                      <li><strong>Guide students</strong> to use the Student Portal with their specific proof.</li>
                    </ol>
                    <p className="mb-0"><strong>💡 Tip:</strong> The downloaded file contains detailed instructions for both organizers and students!</p>
                  </div>
              </div>
            </div>
            
            {/* Error and success messages */}
            {error && (
              <div className="alert alert-danger mt-3">
                {error}

                {/* Manual contract check for TRANSACTION_REPLACED errors */}
                {error.includes('TRANSACTION_REPLACED') || error.includes('replaced') && (
                  <div className="mt-3 p-3 border rounded bg-light">
                    <h6>🔍 Manual Contract Verification</h6>
                    <p className="small mb-2">
                      Your transaction may have succeeded despite the error. Check if your contract was deployed:
                    </p>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter contract address to verify"
                        value={contractAddress}
                        onChange={(e) => setContractAddress(e.target.value)}
                      />
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => handleManualContractCheck(contractAddress)}
                        disabled={checkingContract}
                      >
                        {checkingContract ? 'Checking...' : '🔍 Verify Contract'}
                      </button>
                    </div>
                    <small className="text-muted">
                      Check the transaction hash on <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer">Sepolia Etherscan</a> for the contract address.
                    </small>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success mt-3">
                {successMsg}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default OrganizerPortal; 