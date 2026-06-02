// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Test-only ERC-20 that mimics USDC (6 decimals).
 *      Anyone can call faucet() to get 10,000 test USDC.
 *      NOT for production use.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** 6; // 10,000 USDC

    constructor(address initialOwner)
        ERC20("USD Coin (Test)", "USDC")
        Ownable(initialOwner)
    {
        // Mint 1 M USDC to the deployer/treasury for manual distribution
        _mint(initialOwner, 1_000_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Anyone can call this to receive 10,000 test USDC.
    function faucet(address to) external {
        _mint(to, FAUCET_AMOUNT);
    }

    /// @notice Owner can mint arbitrary amounts for testing.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
