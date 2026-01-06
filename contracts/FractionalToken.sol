// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract FractionalToken is ERC20, Ownable {
    address public propertyNFT;
    uint256 public propertyTokenId;
    uint256 public pricePerShare; // in wei
    bool public isTradable = false;
    address public propertyOwner;

    event SharesPurchased(address buyer, uint256 amount);
    event TradingEnabled();
    event TradingDisabled();

    constructor(
        string memory name,
        string memory symbol,
        uint256 _propertyTokenId,
        uint256 _totalShares,
        uint256 _pricePerShare,
        address _propertyNFT,
        address _propertyOwner
    ) ERC20(name, symbol) Ownable(_propertyOwner) {
        require(_totalShares > 0, "Total shares must be greater than 0");
        require(_pricePerShare > 0, "Price per share must be greater than 0");
        require(_propertyNFT != address(0), "Invalid property NFT address");
        require(_propertyOwner != address(0), "Invalid property owner address");

        propertyNFT = _propertyNFT;
        propertyTokenId = _propertyTokenId;
        pricePerShare = _pricePerShare;
        propertyOwner = _propertyOwner;

        // Mint all shares to the property owner initially
        _mint(_propertyOwner, _totalShares * (10 ** decimals()));
    }

    function enableTrading() public onlyOwner {
        require(!isTradable, "Trading already enabled");
        isTradable = true;
        emit TradingEnabled();
    }

    function disableTrading() public onlyOwner {
        require(isTradable, "Trading already disabled");
        isTradable = false;
        emit TradingDisabled();
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // Skip if it's a mint or burn
        if (from != address(0) && to != address(0)) {
            // Allow the owner to transfer tokens even when trading is disabled
            if (from != owner() && to != owner()) {
                require(isTradable, "Trading is not enabled for this token");
            }
        }
        
        super._update(from, to, amount);
    }

    function buyShares(uint256 numberOfShares) public payable {
        require(isTradable, "Trading is not enabled for this token");
        require(numberOfShares > 0, "Must buy at least one share");
        
        uint256 totalPrice = numberOfShares * pricePerShare;
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        _transfer(owner(), msg.sender, numberOfShares * (10 ** decimals()));

        // Refund excess ETH
        if (msg.value > totalPrice) {
            uint256 refundAmount = msg.value - totalPrice;
            (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
            require(success, "Refund failed");
        }

        emit SharesPurchased(msg.sender, numberOfShares);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
