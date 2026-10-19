// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Generative3DNFT
 * @dev Enterprise-grade ERC721 contract for 3D procedural and AI-generated digital artifacts
 * featuring decentralized IPFS metadata, animation_url GLB bindings, reentrancy guards,
 * and Polygon Mainnet & Amoy Testnet optimizations.
 */
contract Generative3DNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 public mintPrice;
    uint256 public maxSupply;

    // Events
    event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    // Errors
    error InsufficientPayment(uint256 provided, uint256 required);
    error MaxSupplyExceeded(uint256 currentSupply, uint256 maxSupply);
    error ZeroAddress();
    error WithdrawalFailed();
    error InvalidMintPrice();

    /**
     * @notice Initializes the generative 3D NFT collection
     * @param initialOwner The address designated as contract owner
     * @param initialMintPrice The initial mint cost in wei (e.g. 5 MATIC = 5 ether)
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
     * @notice Mints a new 3D NFT with its verified IPFS metadata URI
     * @param recipient The wallet address receiving the newly minted token
     * @param tokenURI The IPFS URI (e.g. ipfs://bafy.../metadata.json) containing GLB animation_url
     * @return tokenId The ID assigned to the minted NFT
     */
    function mintNFT(address recipient, string memory tokenURI)
        external
        payable
        nonReentrant
        returns (uint256)
    {
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
     * @notice Returns the current total number of minted tokens
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Administrative function to update the mint fee
     * @param newPrice The updated price in wei
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
}
