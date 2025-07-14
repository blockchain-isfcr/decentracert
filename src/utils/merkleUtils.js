import { MerkleTree } from 'merkletreejs';

// Note: All functions now use ethers.utils.keccak256 with solidityPack for consistency with smart contracts

/**
 * Generate a Merkle tree from a list of addresses using ethers encoding
 * @param {string[]} addresses - Array of Ethereum addresses
 * @returns {object} - Merkle tree object
 */
export const generateMerkleTree = (addresses) => {
  if (!addresses || addresses.length === 0) {
    throw new Error('Addresses array is required and must not be empty');
  }

  const ethers = require('ethers');
  const keccak256 = require('keccak256');

  // Create leaf nodes using ethers encoding (consistent with smart contract)
  const leafNodes = addresses.map(addr =>
    ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [addr]))
  );

  // Create Merkle tree
  return new MerkleTree(leafNodes, keccak256, { sortPairs: true });
};

/**
 * Generate a Merkle root from a list of addresses
 * @param {string[]} addresses - Array of Ethereum addresses
 * @returns {string} - Merkle root as a hex string
 */
export const generateMerkleRoot = (addresses) => {
  const merkleTree = generateMerkleTree(addresses);
  return merkleTree.getHexRoot();
};

/**
 * Generate a Merkle proof for an address using ethers encoding
 * @param {string[]} addresses - Array of Ethereum addresses
 * @param {string} address - Address to generate proof for
 * @returns {string[]} - Merkle proof as an array of hex strings
 */
export const generateMerkleProof = (addresses, address) => {
  const ethers = require('ethers');
  const merkleTree = generateMerkleTree(addresses);
  const leaf = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [address]));
  return merkleTree.getHexProof(leaf);
};

/**
 * Verify a Merkle proof using ethers encoding
 * @param {string} address - Address to verify
 * @param {string[]} proof - Merkle proof as an array of hex strings
 * @param {string} root - Merkle root as a hex string
 * @returns {boolean} - Whether the proof is valid
 */
export const verifyMerkleProof = (address, proof, root) => {
  const ethers = require('ethers');
  const keccak256 = require('keccak256');
  const leaf = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [address]));
  return MerkleTree.verify(proof, leaf, root, keccak256, { sortPairs: true });
};

/**
 * Generate Merkle proofs for all addresses using consistent ethers encoding
 * Works for 1, 2, or n addresses - always generates proper Merkle tree
 * @param {string[]} addresses - Array of Ethereum addresses
 * @returns {object} - Object mapping addresses to their proofs
 */
export const generateAllMerkleProofs = (addresses) => {
  console.log('🌳 UNIVERSAL MERKLE TREE GENERATOR');
  console.log('📝 Input addresses:', addresses);
  console.log('📊 Number of addresses:', addresses.length);

  // Use ethers method for consistent encoding across ALL cases
  const ethers = require('ethers');
  const { MerkleTree } = require('merkletreejs');
  const keccak256 = require('keccak256');

  // Validate input
  if (!addresses || addresses.length === 0) {
    throw new Error('At least one address is required');
  }

  // Generate leaves using CONSISTENT ethers encoding for ALL cases
  const leaves = addresses.map((address, index) => {
    const normalizedAddress = address.toLowerCase();
    const leaf = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [normalizedAddress]));
    console.log(`🍃 Leaf ${index + 1} for ${normalizedAddress}: ${leaf}`);
    return leaf;
  });

  console.log('🍃 All generated leaves:', leaves);

  // UNIVERSAL APPROACH: Always create a proper Merkle tree
  // This works for 1, 2, 3, or any number of addresses
  const merkleTree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    duplicateOdd: false // Don't duplicate odd leaves
  });

  const merkleRoot = merkleTree.getHexRoot();
  console.log('🌳 Generated Merkle root:', merkleRoot);

  // Generate proofs for each address
  const proofs = {};
  addresses.forEach((address, index) => {
    const normalizedAddress = address.toLowerCase();
    const leaf = leaves[index];
    const proof = merkleTree.getHexProof(leaf);
    proofs[normalizedAddress] = proof;

    console.log(`🔐 Proof for ${normalizedAddress}:`, proof);
    console.log(`📏 Proof length: ${proof.length}`);

    // Verify the proof immediately
    const isValid = merkleTree.verify(proof, leaf, merkleRoot);
    console.log(`✅ Proof verification for ${normalizedAddress}: ${isValid}`);
  });

  const result = {
    merkleRoot,
    proofs
  };

  console.log('🎯 FINAL UNIVERSAL RESULT:', result);
  console.log('📋 Summary:');
  console.log(`   - Addresses: ${addresses.length}`);
  console.log(`   - Merkle Root: ${merkleRoot}`);
  console.log(`   - All proofs generated: ${Object.keys(proofs).length}`);

  return result;
};

/**
 * Check if an address is in the Merkle tree
 * @param {string} address - Address to check
 * @param {object} merkleProofs - Object mapping addresses to their proofs
 * @param {string} merkleRoot - Merkle root as a hex string
 * @returns {boolean} - Whether the address is in the Merkle tree
 */
export const isAddressInMerkleTree = (address, merkleProofs, merkleRoot) => {
  // Check if the address has a proof
  if (!merkleProofs[address]) {
    return false;
  }
  
  // Verify the proof
  return verifyMerkleProof(address, merkleProofs[address], merkleRoot);
}; 