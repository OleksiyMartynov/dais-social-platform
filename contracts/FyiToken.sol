pragma solidity ^0.5.8;

import "./Token/ERC20Detailed.sol";

import "./Token/SimpleCBT.sol";

contract FyiToken is SimpleCBT, ERC20Detailed {
    constructor(
        string memory name,
        string memory symbol,
        uint256 reserveRatio
    )   public
        SimpleCBT(reserveRatio)
        ERC20Detailed(name, symbol, 18)
    {}
}