// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/**
 * @title CarbonAfrika Marketplace
 * @notice Escrow-based marketplace for trading carbon credit tokens (ERC-1155).
 *         Sellers list credits; buyers purchase with USDC or MATIC.
 *         Platform takes a 2% fee on each trade.
 */
contract Marketplace is ReentrancyGuard, Ownable, ERC1155Holder {
    IERC1155 public immutable carbonToken;
    uint256 public platformFeeBps = 200; // 2%

    struct Listing {
        uint256 id;
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 pricePerUnit; // in wei (MATIC) or token smallest unit
        address paymentToken;  // address(0) = MATIC
        bool active;
    }

    uint256 private _nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 tokenId, uint256 amount, uint256 pricePerUnit);
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 totalPrice);
    event ListingCancelled(uint256 indexed listingId);

    constructor(address _carbonToken, address initialOwner) Ownable(initialOwner) {
        carbonToken = IERC1155(_carbonToken);
    }

    function listCredits(
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit,
        address paymentToken
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(pricePerUnit > 0, "Price must be > 0");

        // Transfer tokens into escrow (this contract)
        carbonToken.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        uint256 id = _nextListingId++;
        listings[id] = Listing({
            id: id,
            seller: msg.sender,
            tokenId: tokenId,
            amount: amount,
            pricePerUnit: pricePerUnit,
            paymentToken: paymentToken,
            active: true
        });

        emit Listed(id, msg.sender, tokenId, amount, pricePerUnit);
        return id;
    }

    function purchase(uint256 listingId, uint256 amount) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(amount > 0 && amount <= listing.amount, "Invalid amount");

        uint256 totalPrice = amount * listing.pricePerUnit;
        uint256 fee = (totalPrice * platformFeeBps) / 10000;
        uint256 sellerAmount = totalPrice - fee;

        if (listing.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "Insufficient MATIC");
            payable(listing.seller).transfer(sellerAmount);
            payable(owner()).transfer(fee);
            if (msg.value > totalPrice) payable(msg.sender).transfer(msg.value - totalPrice);
        } else {
            IERC20 token = IERC20(listing.paymentToken);
            token.transferFrom(msg.sender, listing.seller, sellerAmount);
            token.transferFrom(msg.sender, owner(), fee);
        }

        listing.amount -= amount;
        if (listing.amount == 0) listing.active = false;

        carbonToken.safeTransferFrom(address(this), msg.sender, listing.tokenId, amount, "");
        emit Purchased(listingId, msg.sender, amount, totalPrice);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(listing.seller == msg.sender || msg.sender == owner(), "Not authorized");

        listing.active = false;
        carbonToken.safeTransferFrom(address(this), listing.seller, listing.tokenId, listing.amount, "");
        emit ListingCancelled(listingId);
    }

    function setFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        platformFeeBps = bps;
    }
}
