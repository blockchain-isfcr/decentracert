const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

describe("CertificateNFT", function () {
  let CertificateNFT;
  let certificateNFT;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;
  let merkleTree;
  let merkleRoot;

  // Test data
  const eventName = "Test Event";
  const eventSymbol = "TEST";
  const eventDescription = "Test event description";
  const eventDate = "2023-06-15";
  const eventImageURI = "ipfs://QmTest";

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    // Create Merkle tree with whitelisted addresses
    const whitelistedAddresses = [
      addr1.address,
      addr2.address,
    ];
    
    // Create leaf nodes and Merkle tree
    const leafNodes = whitelistedAddresses.map(addr => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();
    
    // Deploy the contract
    CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    certificateNFT = await CertificateNFT.deploy(
      eventName,
      eventSymbol,
      eventName,
      eventDescription,
      eventDate,
      eventImageURI,
      merkleRoot
    );
    
    await certificateNFT.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct event details", async function () {
      expect(await certificateNFT.eventName()).to.equal(eventName);
      expect(await certificateNFT.eventDescription()).to.equal(eventDescription);
      expect(await certificateNFT.eventDate()).to.equal(eventDate);
      expect(await certificateNFT.eventImageURI()).to.equal(eventImageURI);
      expect(await certificateNFT.merkleRoot()).to.equal(merkleRoot);
    });

    it("Should set the right owner", async function () {
      expect(await certificateNFT.owner()).to.equal(owner.address);
    });
  });

  describe("Eligibility", function () {
    it("Should return true for whitelisted addresses", async function () {
      // Generate Merkle proof for addr1
      const proof = merkleTree.getHexProof(keccak256(addr1.address));
      
      // Check eligibility
      expect(await certificateNFT.isEligible(addr1.address, proof)).to.be.true;
    });

    it("Should return false for non-whitelisted addresses", async function () {
      // Generate a proof for addr3 (not in the whitelist)
      const proof = merkleTree.getHexProof(keccak256(addr3.address));
      
      // Check eligibility
      expect(await certificateNFT.isEligible(addr3.address, proof)).to.be.false;
    });
  });

  describe("Certificate Claiming", function () {
    it("Should allow whitelisted addresses to claim", async function () {
      // Generate Merkle proof for addr1
      const proof = merkleTree.getHexProof(keccak256(addr1.address));
      
      // Token URI for the certificate
      const tokenURI = "ipfs://QmTestCertificate";
      
      // Claim certificate
      await expect(certificateNFT.connect(addr1).claimCertificate(proof, tokenURI))
        .to.emit(certificateNFT, "CertificateClaimed")
        .withArgs(addr1.address, 0, tokenURI);
      
      // Check that the certificate was claimed
      expect(await certificateNFT.hasClaimed(addr1.address)).to.be.true;
      
      // Check token ownership
      expect(await certificateNFT.ownerOf(0)).to.equal(addr1.address);
      
      // Check token URI
      expect(await certificateNFT.tokenURI(0)).to.equal(tokenURI);
    });

    it("Should not allow non-whitelisted addresses to claim", async function () {
      // Generate a proof for addr3 (not in the whitelist)
      const proof = merkleTree.getHexProof(keccak256(addr3.address));
      
      // Token URI for the certificate
      const tokenURI = "ipfs://QmTestCertificate";
      
      // Try to claim certificate
      await expect(
        certificateNFT.connect(addr3).claimCertificate(proof, tokenURI)
      ).to.be.revertedWith("Invalid proof");
    });

    it("Should not allow claiming twice", async function () {
      // Generate Merkle proof for addr1
      const proof = merkleTree.getHexProof(keccak256(addr1.address));
      
      // Token URI for the certificate
      const tokenURI = "ipfs://QmTestCertificate";
      
      // Claim certificate
      await certificateNFT.connect(addr1).claimCertificate(proof, tokenURI);
      
      // Try to claim again
      await expect(
        certificateNFT.connect(addr1).claimCertificate(proof, tokenURI)
      ).to.be.revertedWith("Certificate already claimed");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update Merkle root", async function () {
      // Create a new Merkle tree with different addresses
      const newWhitelistedAddresses = [
        addr3.address,
      ];
      
      const newLeafNodes = newWhitelistedAddresses.map(addr => keccak256(addr));
      const newMerkleTree = new MerkleTree(newLeafNodes, keccak256, { sortPairs: true });
      const newMerkleRoot = newMerkleTree.getHexRoot();
      
      // Update Merkle root
      await expect(certificateNFT.updateMerkleRoot(newMerkleRoot))
        .to.emit(certificateNFT, "MerkleRootUpdated")
        .withArgs(newMerkleRoot);
      
      // Check that the Merkle root was updated
      expect(await certificateNFT.merkleRoot()).to.equal(newMerkleRoot);
      
      // Check that the new whitelist is effective
      const proof = newMerkleTree.getHexProof(keccak256(addr3.address));
      expect(await certificateNFT.isEligible(addr3.address, proof)).to.be.true;
    });

    it("Should allow owner to update event details", async function () {
      // New event details
      const newEventName = "Updated Event";
      const newEventDescription = "Updated description";
      const newEventDate = "2023-07-15";
      const newEventImageURI = "ipfs://QmUpdated";
      
      // Update event details
      await expect(certificateNFT.updateEventDetails(
        newEventName,
        newEventDescription,
        newEventDate,
        newEventImageURI
      ))
        .to.emit(certificateNFT, "EventDetailsUpdated")
        .withArgs(newEventName, newEventDescription, newEventDate, newEventImageURI);
      
      // Check that the event details were updated
      expect(await certificateNFT.eventName()).to.equal(newEventName);
      expect(await certificateNFT.eventDescription()).to.equal(newEventDescription);
      expect(await certificateNFT.eventDate()).to.equal(newEventDate);
      expect(await certificateNFT.eventImageURI()).to.equal(newEventImageURI);
    });

    it("Should not allow non-owners to update Merkle root", async function () {
      // Create a valid bytes32 value for testing
      const newMerkleRoot = ethers.utils.hexZeroPad("0x1234", 32);
      
      // Try to update Merkle root as non-owner
      await expect(
        certificateNFT.connect(addr1).updateMerkleRoot(newMerkleRoot)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow non-owners to update event details", async function () {
      // Try to update event details as non-owner
      await expect(
        certificateNFT.connect(addr1).updateEventDetails("Test", "Test", "Test", "Test")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 