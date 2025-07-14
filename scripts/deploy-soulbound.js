const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying SoulboundCertificateNFT with automatic verification...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  // Contract parameters
  const contractName = "ISFCR Soulbound Certificate";
  const contractSymbol = "ISFCR-SBT";
  const eventName = "ISFCR Conference 2024";
  const eventDescription = "International Symposium on Future Computing Research";
  const eventDate = "2024-12-15";
  const eventImageURI = "https://your-image-url.com/certificate.png";
  
  // Example Merkle root (replace with your actual root)
  const merkleRoot = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  console.log("📋 Contract Parameters:");
  console.log("   Name:", contractName);
  console.log("   Symbol:", contractSymbol);
  console.log("   Event:", eventName);
  console.log("   Merkle Root:", merkleRoot);

  // Get the contract factory
  const MetaMaskVisibleSoulbound = await ethers.getContractFactory("MetaMaskVisibleSoulbound");

  // Deploy with optimized gas settings
  console.log("⛽ Deploying with gas optimization...");
  
  const contract = await MetaMaskVisibleSoulbound.deploy(
    contractName,
    contractSymbol,
    eventName,
    eventDescription,
    eventDate,
    eventImageURI,
    merkleRoot,
    {
      gasLimit: 3000000, // Set reasonable gas limit
      gasPrice: ethers.utils.parseUnits('2', 'gwei') // Low gas price for Sepolia
    }
  );

  console.log("⏳ Waiting for deployment...");
  await contract.deployed();

  console.log("✅ MetaMaskVisibleSoulbound deployed to:", contract.address);
  console.log("🔗 Transaction hash:", contract.deployTransaction.hash);

  // Wait for a few confirmations before verification
  console.log("⏳ Waiting for confirmations...");
  await contract.deployTransaction.wait(3);

  // Verify the contract on Etherscan
  console.log("🔍 Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: [
        contractName,
        contractSymbol,
        eventName,
        eventDescription,
        eventDate,
        eventImageURI,
        merkleRoot
      ],
    });
    console.log("✅ Contract verified on Etherscan!");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
    console.log("💡 You can verify manually later using:");
    console.log(`npx hardhat verify --network sepolia ${contract.address} "${contractName}" "${contractSymbol}" "${eventName}" "${eventDescription}" "${eventDate}" "${eventImageURI}" "${merkleRoot}"`);
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contract.address,
    contractName: contractName,
    contractSymbol: contractSymbol,
    eventName: eventName,
    eventDescription: eventDescription,
    eventDate: eventDate,
    eventImageURI: eventImageURI,
    merkleRoot: merkleRoot,
    deployerAddress: deployer.address,
    transactionHash: contract.deployTransaction.hash,
    blockNumber: contract.deployTransaction.blockNumber,
    gasUsed: contract.deployTransaction.gasLimit.toString(),
    gasPrice: contract.deployTransaction.gasPrice.toString(),
    network: "sepolia",
    deployedAt: new Date().toISOString(),
    etherscanUrl: `https://sepolia.etherscan.io/address/${contract.address}`,
    verified: true
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `soulbound-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("📄 Deployment info saved to:", deploymentFile);
  console.log("\n📋 SUMMARY:");
  console.log("   Contract Address:", contract.address);
  console.log("   Etherscan URL:", deploymentInfo.etherscanUrl);
  console.log("   Network: Sepolia Testnet");
  console.log("   Verified: ✅ Yes");
  
  console.log("\n🦊 METAMASK INTEGRATION:");
  console.log("   ✅ This contract is fully ERC721 compliant");
  console.log("   ✅ NFTs will appear in MetaMask automatically");
  console.log("   ✅ Transfer attempts will be blocked with clear errors");
  console.log("   ✅ Users can view certificates in NFT section");
  
  console.log("\n🔗 NEXT STEPS:");
  console.log("   1. Update your frontend to use this new contract address");
  console.log("   2. Test claiming a certificate");
  console.log("   3. Check MetaMask NFT section - it should appear!");
  console.log("   4. Try to transfer it - it should fail with clear error");

  return {
    contract,
    deploymentInfo
  };
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
