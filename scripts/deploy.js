const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Sample event details - you can replace these with actual event details
  const eventName = "University Blockchain Workshop 2023";
  const eventSymbol = "UBW23";
  const eventDescription = "Certification for completing the Blockchain Workshop";
  const eventDate = "2023-06-15";
  const eventImageURI = "ipfs://QmYourIPFSHash"; // Replace with actual IPFS hash

  // Sample addresses for the whitelist - replace with actual addresses
  const whitelistedAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    // Add more addresses as needed
  ];

  // Create merkle tree from the whitelisted addresses
  const leafNodes = whitelistedAddresses.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  const merkleRoot = merkleTree.getHexRoot();

  console.log("Merkle Root:", merkleRoot);

  // Deploy the contract
  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const certificateNFT = await CertificateNFT.deploy(
    eventName,
    eventSymbol,
    eventName,
    eventDescription,
    eventDate,
    eventImageURI,
    merkleRoot
  );

  await certificateNFT.deployed();

  console.log("CertificateNFT deployed to:", certificateNFT.address);
  console.log("Transaction hash:", certificateNFT.deployTransaction.hash);

  // Verify merkle proof for sample address (for testing)
  const testAddress = whitelistedAddresses[0];
  const hexProof = merkleTree.getHexProof(keccak256(testAddress));
  console.log(`\nMerkle Proof for ${testAddress}:`, hexProof);

  // Save the proofs to a JSON file (commented out - uncomment when needed)
  // const fs = require("fs");
  // const proofs = {};
  // whitelistedAddresses.forEach(address => {
  //   proofs[address] = merkleTree.getHexProof(keccak256(address));
  // });
  // fs.writeFileSync("merkle-proofs.json", JSON.stringify(proofs, null, 2));
  // console.log("Merkle proofs saved to merkle-proofs.json");

  console.log("\nWaiting for block confirmations...");
  await certificateNFT.deployTransaction.wait(5);
  
  // Verify contract on Etherscan
  console.log("\nVerifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: certificateNFT.address,
      constructorArguments: [
        eventName,
        eventSymbol,
        eventName,
        eventDescription,
        eventDate,
        eventImageURI,
        merkleRoot,
      ],
    });
    console.log("Contract verified on Etherscan!");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 