// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FractionalToken.sol";
import "./PropertyNFT.sol";

contract FractionalTokenFactory {
    event FractionalTokenCreated(
        address indexed propertyNFT,
        uint256 indexed propertyTokenId,
        address indexed fractionalToken,
        string name,
        string symbol,
        uint256 totalShares,
        uint256 pricePerShare
    );

    function createFractionalToken(
        address propertyNFTAddress,
        uint256 propertyTokenId,
        string memory name,
        string memory symbol,
        uint256 totalShares,
        uint256 pricePerShare
    ) public returns (address) {
        PropertyNFT propertyNFT = PropertyNFT(propertyNFTAddress);
        address propertyOwner = propertyNFT.ownerOf(propertyTokenId);
        
        FractionalToken fractionalToken = new FractionalToken(
            name,
            symbol,
            propertyTokenId,
            totalShares,
            pricePerShare,
            propertyNFTAddress,
            propertyOwner
        );

        emit FractionalTokenCreated(
            propertyNFTAddress,
            propertyTokenId,
            address(fractionalToken),
            name,
            symbol,
            totalShares,
            pricePerShare
        );

        return address(fractionalToken);
    }
}