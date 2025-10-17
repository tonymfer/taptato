// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestUSDC
 * @notice Simple test token for Base Sepolia development
 * @dev Anyone can mint tokens for testing
 */
contract TestUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {
        // Mint 1,000,000 USDC to deployer
        _mint(msg.sender, 1000000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Anyone can mint for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Faucet: Give 100 USDC to caller
    function faucet() external {
        _mint(msg.sender, 100 * 10 ** 6); // 100 USDC
    }
}
