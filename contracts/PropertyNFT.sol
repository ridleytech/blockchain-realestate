// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PropertyNFT is ERC721URIStorage, Ownable {
    // Token ID counter
    uint256 private _tokenIdCounter = 1; // Start from 1

    constructor() ERC721("RealEstateToken", "RET") Ownable() {}

    // Override required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721URIStorage) {
        super._burn(tokenId);
    }

    // Mapping from token ID to property details
    struct Property {
        string title;
        string location;
        uint256 price;
        uint256 size; // in square feet
        uint256 totalShares;
        bool isListed;
        address fractionalToken;
    }

    mapping(uint256 => Property) public properties;

    // Events
    event PropertyMinted(
        uint256 indexed tokenId,
        string title,
        address indexed owner,
        string tokenUri
    );
    event PropertyListed(uint256 indexed tokenId, uint256 price, uint256 totalShares);
    event PropertyUnlisted(uint256 indexed tokenId);

    // Mint a new property NFT
    function mintProperty(
        address to,
        string memory title,
        string memory location,
        uint256 size,
        string memory tokenUri
    ) public onlyOwner returns (uint256) {
        uint256 newTokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenUri);

        // Store property details
        properties[newTokenId] = Property({
            title: title,
            location: location,
            price: 0,
            size: size,
            totalShares: 0,
            isListed: false,
            fractionalToken: address(0)
        });

        emit PropertyMinted(newTokenId, title, to, tokenUri);
        return newTokenId;
    }

    // List property for fractional ownership
    function listForFractionalOwnership(
        uint256 tokenId,
        uint256 price,
        uint256 totalShares,
        address fractionalToken
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!properties[tokenId].isListed, "Already listed");
        require(totalShares > 0, "Total shares must be greater than 0");

        properties[tokenId].price = price;
        properties[tokenId].totalShares = totalShares;
        properties[tokenId].isListed = true;
        properties[tokenId].fractionalToken = fractionalToken;

        emit PropertyListed(tokenId, price, totalShares);
    }

    // Unlist property from fractional ownership
    function unlistProperty(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(properties[tokenId].isListed, "Not listed for fractional ownership");

        properties[tokenId].isListed = false;
        emit PropertyUnlisted(tokenId);
    }
}