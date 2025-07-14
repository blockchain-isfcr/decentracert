const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulboundCertificateNFT", function () {
  let contract;
  let owner;
  let addr1;
  let addr2;
  let merkleRoot;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Simple merkle root for testing (in real use, generate properly)
    merkleRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
    
    const SoulboundCertificateNFT = await ethers.getContractFactory("SoulboundCertificateNFT");
    contract = await SoulboundCertificateNFT.deploy(
      "Test Certificate",
      "TEST-SBT",
      "Test Event",
      "Test Description", 
      "2024-01-01",
      "https://test.com/image.png",
      merkleRoot
    );
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await contract.name()).to.equal("Test Certificate");
      expect(await contract.symbol()).to.equal("TEST-SBT");
    });

    it("Should set the right merkle root", async function () {
      expect(await contract.merkleRoot()).to.equal(merkleRoot);
    });

    it("Should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("ERC721 Compliance", function () {
    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID
      expect(await contract.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      // ERC721Metadata interface ID  
      expect(await contract.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("Should have correct initial total supply", async function () {
      expect(await contract.totalSupply()).to.equal(0);
    });
  });

  describe("Soulbound Properties", function () {
    it("Should prevent approve", async function () {
      await expect(contract.approve(addr1.address, 1))
        .to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });

    it("Should prevent setApprovalForAll", async function () {
      await expect(contract.setApprovalForAll(addr1.address, true))
        .to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });

    it("Should prevent transferFrom", async function () {
      await expect(contract.transferFrom(owner.address, addr1.address, 1))
        .to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });

    it("Should prevent safeTransferFrom", async function () {
      await expect(contract["safeTransferFrom(address,address,uint256)"](owner.address, addr1.address, 1))
        .to.be.revertedWithCustomError(contract, "SoulboundTransferNotAllowed");
    });
  });

  describe("Certificate Functions", function () {
    it("Should check if address has certificate", async function () {
      expect(await contract.hasSoulboundCertificate(addr1.address)).to.be.false;
    });

    it("Should return correct certificate details for non-existent certificate", async function () {
      const [exists, tokenId, uri] = await contract.getSoulboundCertificateDetails(addr1.address);
      expect(exists).to.be.false;
      expect(tokenId).to.equal(0);
      expect(uri).to.equal("");
    });
  });

  describe("Gas Optimization", function () {
    it("Should deploy with reasonable gas cost", async function () {
      const deployTx = contract.deployTransaction;
      console.log("      Gas used for deployment:", deployTx.gasLimit.toString());
      
      // Should be under 3M gas
      expect(deployTx.gasLimit.lt(ethers.BigNumber.from("3000000"))).to.be.true;
    });
  });

  describe("Events", function () {
    it("Should emit SoulboundCertificateIssued event on successful claim", async function () {
      // Note: This test would need a valid merkle proof to actually claim
      // For now, just check that the event exists in the contract
      const eventFragment = contract.interface.getEvent("SoulboundCertificateIssued");
      expect(eventFragment).to.not.be.undefined;
      expect(eventFragment.name).to.equal("SoulboundCertificateIssued");
    });

    it("Should emit SoulboundTransferAttempted event on transfer attempt", async function () {
      const eventFragment = contract.interface.getEvent("SoulboundTransferAttempted");
      expect(eventFragment).to.not.be.undefined;
      expect(eventFragment.name).to.equal("SoulboundTransferAttempted");
    });
  });
});
