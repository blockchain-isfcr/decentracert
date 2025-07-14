// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title SoulboundCertificateNFT
 * @dev Ultra-gas-optimized Soulbound Certificate implementation
 * @notice Certificates are permanently bound to the recipient's address
 * @notice Non-transferable, non-sellable, immutable proof of achievement
 */
contract CertificateNFT {
    // Immutable deployment data for gas efficiency
    bytes32 public immutable merkleRoot;
    address public immutable owner;
    string public name;
    string public symbol;

    // Ultra-compact state in single slot
    uint256 private _state; // nextTokenId (128 bits) + totalSupply (128 bits)

    // Soulbound mappings - certificates permanently bound to addresses
    mapping(uint256 => address) private _soulboundOwners;    // Token to soul binding
    mapping(address => bool) public hasClaimed;              // Claim tracking
    mapping(uint256 => string) private _tokenURIs;           // Metadata URIs
    mapping(address => uint256) public soulboundTokenId;     // Address to token mapping

    // Standard ERC721 events for MetaMask compatibility
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // Soulbound-specific events
    event SoulboundCertificateIssued(address indexed soul, uint256 indexed tokenId, string tokenURI);
    event SoulboundVerificationRequested(address indexed verifier, address indexed soul, uint256 indexed tokenId);

    // Custom errors for soulbound violations
    error SoulboundTransferNotAllowed();
    error SoulboundApprovalNotAllowed();
    error CertificateAlreadyBound();
    error NotSoulboundOwner();

    constructor(
        string memory _name,
        string memory _symbol,
        string memory, // _eventName - not stored to save gas
        string memory, // _eventDescription - not stored to save gas
        string memory, // _eventDate - not stored to save gas
        string memory, // _eventImageURI - not stored to save gas
        bytes32 _merkleRoot
    ) {
        name = _name;
        symbol = _symbol;
        merkleRoot = _merkleRoot;
        owner = msg.sender;
        _state = 1; // nextTokenId = 1, totalSupply = 0
    }

    // Soulbound-specific view functions
    function soulboundOwnerOf(uint256 tokenId) external view returns (address) {
        address soul = _soulboundOwners[tokenId];
        require(soul != address(0), "Certificate does not exist");
        return soul;
    }

    function balanceOf(address soul) external view returns (uint256) {
        require(soul != address(0), "Invalid address");
        return hasClaimed[soul] ? 1 : 0; // Each soul can only have one certificate
    }

    function totalSupply() external view returns (uint256) {
        return _state >> 128;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_soulboundOwners[tokenId] != address(0), "Certificate does not exist");
        return _tokenURIs[tokenId];
    }

    // Check if an address has a soulbound certificate
    function hasSoulboundCertificate(address soul) external view returns (bool) {
        return hasClaimed[soul];
    }

    // Get the token ID for a specific soul (if they have one)
    function getSoulboundTokenId(address soul) external view returns (uint256) {
        require(hasClaimed[soul], "No certificate found for this address");
        return soulboundTokenId[soul];
    }

    // ERC721-compatible functions for MetaMask visibility (but soulbound)
    function ownerOf(uint256 tokenId) external view returns (address) {
        address soul = _soulboundOwners[tokenId];
        require(soul != address(0), "Certificate does not exist");
        return soul;
    }

    // Approval functions - allow viewing but prevent actual transfers
    function approve(address, uint256) external pure {
        revert SoulboundApprovalNotAllowed();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0); // No approvals allowed for soulbound tokens
    }

    function setApprovalForAll(address, bool) external pure {
        revert SoulboundApprovalNotAllowed();
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false; // No approvals allowed for soulbound tokens
    }

    // Transfer functions - always revert to maintain soulbound nature
    function transferFrom(address, address, uint256) external pure {
        revert SoulboundTransferNotAllowed();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert SoulboundTransferNotAllowed();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert SoulboundTransferNotAllowed();
    }

    // SOULBOUND certificate claiming - permanently binds certificate to soul
    function claimSoulboundCertificate(bytes32[] calldata _merkleProof, string calldata _tokenURI) external {
        address soul = msg.sender;

        // Prevent double claiming
        if (hasClaimed[soul]) revert CertificateAlreadyBound();

        // Generate leaf using CONSISTENT encoding with JavaScript
        bytes32 leaf = keccak256(abi.encodePacked(soul));

        // UNIVERSAL verification - works for 1, 2, or any number of addresses
        require(_verifyProof(_merkleProof, leaf), "Invalid Merkle proof");

        // Mark as claimed first (CEI pattern)
        hasClaimed[soul] = true;

        // Ultra-compact state update
        uint256 currentState = _state;
        uint256 tokenId = currentState & ((1 << 128) - 1);

        unchecked {
            _state = ((currentState >> 128) + 1) << 128 | (tokenId + 1);
        }

        // SOULBOUND: Permanently bind certificate to soul
        _soulboundOwners[tokenId] = soul;
        soulboundTokenId[soul] = tokenId;
        _tokenURIs[tokenId] = _tokenURI;

        // Emit standard Transfer event for MetaMask compatibility (mint from zero address)
        emit Transfer(address(0), soul, tokenId);

        // Emit soulbound-specific event
        emit SoulboundCertificateIssued(soul, tokenId, _tokenURI);
    }

    // Legacy function name for backward compatibility
    function claimCertificate(bytes32[] calldata _merkleProof, string calldata _tokenURI) external {
        address soul = msg.sender;

        // Prevent double claiming
        if (hasClaimed[soul]) revert CertificateAlreadyBound();

        // Generate leaf using CONSISTENT encoding with JavaScript
        bytes32 leaf = keccak256(abi.encodePacked(soul));

        // UNIVERSAL verification - works for 1, 2, or any number of addresses
        require(_verifyProof(_merkleProof, leaf), "Invalid Merkle proof");

        // Mark as claimed first (CEI pattern)
        hasClaimed[soul] = true;

        // Ultra-compact state update
        uint256 currentState = _state;
        uint256 tokenId = currentState & ((1 << 128) - 1);

        unchecked {
            _state = ((currentState >> 128) + 1) << 128 | (tokenId + 1);
        }

        // SOULBOUND: Permanently bind certificate to soul
        _soulboundOwners[tokenId] = soul;
        soulboundTokenId[soul] = tokenId;
        _tokenURIs[tokenId] = _tokenURI;

        // Emit standard Transfer event for MetaMask compatibility (mint from zero address)
        emit Transfer(address(0), soul, tokenId);

        // Emit soulbound-specific event
        emit SoulboundCertificateIssued(soul, tokenId, _tokenURI);
    }

    // UNIVERSAL Merkle proof verification - handles ALL cases
    function _verifyProof(bytes32[] calldata proof, bytes32 leaf) private view returns (bool) {
        bytes32 computedHash = leaf;

        // Handle ALL cases: 0 proof elements (single address) to n proof elements
        for (uint256 i = 0; i < proof.length;) {
            bytes32 proofElement = proof[i];

            // Standard Merkle tree verification with sorted pairs
            computedHash = computedHash <= proofElement
                ? keccak256(abi.encodePacked(computedHash, proofElement))
                : keccak256(abi.encodePacked(proofElement, computedHash));

            unchecked { i++; }
        }

        // Final verification against stored root
        return computedHash == merkleRoot;
    }

    // SOULBOUND eligibility check - works for ANY number of addresses
    function isEligibleForSoulboundCertificate(address _soul, bytes32[] calldata _merkleProof) external view returns (bool) {
        // Early return if already has soulbound certificate
        if (hasClaimed[_soul]) return false;

        // Generate leaf using same encoding as JavaScript
        bytes32 leaf = keccak256(abi.encodePacked(_soul));

        // Use universal verification for ALL cases
        return _verifyProof(_merkleProof, leaf);
    }

    // Legacy function name for backward compatibility
    function isEligible(address _address, bytes32[] calldata _merkleProof) external view returns (bool) {
        // Early return if already has soulbound certificate
        if (hasClaimed[_address]) return false;

        // Generate leaf using same encoding as JavaScript
        bytes32 leaf = keccak256(abi.encodePacked(_address));

        // Use universal verification for ALL cases
        return _verifyProof(_merkleProof, leaf);
    }

    // Verify certificate authenticity for a specific soul
    function verifySoulboundCertificate(address _soul) external returns (bool) {
        if (!hasClaimed[_soul]) return false;

        uint256 tokenId = soulboundTokenId[_soul];
        emit SoulboundVerificationRequested(msg.sender, _soul, tokenId);
        return true;
    }

    // Get certificate details for a soul
    function getSoulboundCertificateDetails(address _soul) external view returns (
        bool exists,
        uint256 tokenId,
        string memory uri
    ) {
        if (!hasClaimed[_soul]) {
            return (false, 0, "");
        }

        tokenId = soulboundTokenId[_soul];
        uri = _tokenURIs[tokenId];
        return (true, tokenId, uri);
    }

    // ERC165 interface support
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || // ERC165
               interfaceId == 0x80ac58cd || // ERC721 (partial - soulbound)
               interfaceId == 0x5b5e139f;   // ERC721Metadata
    }
} 