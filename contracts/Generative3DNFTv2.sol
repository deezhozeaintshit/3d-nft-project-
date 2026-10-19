// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Generative3DNFTv2
 * @dev Updatable ERC721 contract for 3D procedural and AI-generated digital artifacts.
 *
 * V2 upgrades over V1:
 *  - updateTokenURI: the token owner (or contract owner) can point a token at new
 *    metadata (e.g. re-pinned IPFS JSON after adding assets) without re-minting.
 *  - Per-token additional file registry: each NFT carries an on-chain, append-only
 *    list of extra files (GLB models, preview images, audio tracks, PBR texture
 *    packs, ...). Files can be added or removed over the token's lifetime.
 *
 * Deployed on Polygon Mainnet & Amoy Testnet.
 */
contract Generative3DNFTv2 is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 public mintPrice;
    uint256 public maxSupply;

    /// @dev An additional file attached to a token (e.g. GLB, PNG, WAV, ZIP).
    struct TokenFile {
        string uri; // ipfs://<cid>/... or https://... location of the file
        string fileType; // MIME-ish label, e.g. "model/gltf-binary", "image/png"
        string name; // human-readable label, e.g. "4K PBR texture pack"
    }

    /// @dev tokenId => list of additional files (append-only via addTokenFile)
    mapping(uint256 => TokenFile[]) private _tokenFiles;

    // Events
    event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    event TokenURIUpdated(uint256 indexed tokenId, string oldURI, string newURI);
    event TokenFileAdded(
        uint256 indexed tokenId,
        uint256 fileIndex,
        string uri,
        string fileType,
        string name
    );
    event TokenFileRemoved(uint256 indexed tokenId, uint256 fileIndex);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    // Errors
    error InsufficientPayment(uint256 provided, uint256 required);
    error MaxSupplyExceeded(uint256 currentSupply, uint256 maxSupply);
    error ZeroAddress();
    error WithdrawalFailed();
    error NonexistentToken(uint256 tokenId);
    error NotAuthorized(address caller, uint256 tokenId);
    error FileIndexOutOfBounds(uint256 tokenId, uint256 index);

    /**
     * @notice Initializes the generative 3D NFT collection
     * @param initialOwner The address designated as contract owner
     * @param initialMintPrice The initial mint cost in wei
     * @param collectionMaxSupply The hard cap limit of total token supply
     */
    constructor(
        address initialOwner,
        uint256 initialMintPrice,
        uint256 collectionMaxSupply
    ) ERC721("PolyDimension 3D Artifacts", "POLY3D") Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        mintPrice = initialMintPrice;
        maxSupply = collectionMaxSupply;
    }

    /**
     * @notice Mints a new 3D NFT with its IPFS metadata URI
     * @param recipient The wallet receiving the token
     * @param tokenURI The metadata URI (e.g. ipfs://<cid>/metadata.json)
     * @return tokenId The ID assigned to the minted NFT
     */
    function mintNFT(
        address recipient,
        string memory tokenURI
    ) external payable nonReentrant returns (uint256) {
        if (recipient == address(0)) revert ZeroAddress();
        if (msg.value < mintPrice) {
            revert InsufficientPayment(msg.value, mintPrice);
        }
        if (_nextTokenId >= maxSupply) {
            revert MaxSupplyExceeded(_nextTokenId, maxSupply);
        }

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTMinted(recipient, tokenId, tokenURI);

        // Refund excess payment if overpaid
        if (msg.value > mintPrice) {
            uint256 excess = msg.value - mintPrice;
            (bool success, ) = msg.sender.call{value: excess}("");
            require(success, "Refund failed");
        }

        return tokenId;
    }

    /**
     * @notice Updates a token's metadata URI (updatable NFT core feature).
     * @dev Callable by the token owner or the contract owner.
     * @param tokenId The token to update
     * @param newURI The new metadata URI
     */
    function updateTokenURI(uint256 tokenId, string memory newURI) external {
        _requireAuthorized(tokenId);
        string memory oldURI = tokenURI(tokenId);
        _setTokenURI(tokenId, newURI);
        emit TokenURIUpdated(tokenId, oldURI, newURI);
    }

    /**
     * @notice Attaches an additional file to a token's on-chain file registry.
     * @dev Callable by the token owner or the contract owner. Appends only.
     * @param tokenId The token to attach the file to
     * @param uri Location of the file (ipfs://... or https://...)
     * @param fileType MIME-ish label, e.g. "model/gltf-binary"
     * @param name Human-readable label, e.g. "Hi-res GLB v2"
     * @return fileIndex Index of the newly added file
     */
    function addTokenFile(
        uint256 tokenId,
        string memory uri,
        string memory fileType,
        string memory name
    ) external returns (uint256) {
        _requireAuthorized(tokenId);
        _tokenFiles[tokenId].push(TokenFile(uri, fileType, name));
        uint256 fileIndex = _tokenFiles[tokenId].length - 1;
        emit TokenFileAdded(tokenId, fileIndex, uri, fileType, name);
        return fileIndex;
    }

    /**
     * @notice Removes a file from a token's registry (swap-and-pop).
     * @dev Callable by the token owner or the contract owner.
     */
    function removeTokenFile(uint256 tokenId, uint256 fileIndex) external {
        _requireAuthorized(tokenId);
        uint256 len = _tokenFiles[tokenId].length;
        if (fileIndex >= len) revert FileIndexOutOfBounds(tokenId, fileIndex);
        if (fileIndex != len - 1) {
            _tokenFiles[tokenId][fileIndex] = _tokenFiles[tokenId][len - 1];
        }
        _tokenFiles[tokenId].pop();
        emit TokenFileRemoved(tokenId, fileIndex);
    }

    /**
     * @notice Returns all additional files attached to a token.
     */
    function getTokenFiles(
        uint256 tokenId
    ) external view returns (TokenFile[] memory) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        return _tokenFiles[tokenId];
    }

    /**
     * @notice Returns the number of additional files attached to a token.
     */
    function tokenFileCount(
        uint256 tokenId
    ) external view returns (uint256) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        return _tokenFiles[tokenId].length;
    }

    /**
     * @notice Returns the current total number of minted tokens
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Administrative function to update the mint fee
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    /**
     * @notice Withdraws the accumulated contract balance to the contract owner
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert WithdrawalFailed();

        (bool success, ) = owner().call{value: balance}("");
        if (!success) revert WithdrawalFailed();

        emit FundsWithdrawn(owner(), balance);
    }

    /// @dev Reverts unless the token exists and the caller is its owner or the contract owner.
    function _requireAuthorized(uint256 tokenId) internal view {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        if (msg.sender != _ownerOf(tokenId) && msg.sender != owner()) {
            revert NotAuthorized(msg.sender, tokenId);
        }
    }
}
