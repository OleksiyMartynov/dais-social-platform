pragma solidity ^0.5.8;

// https://github.com/OpenZeppelin/

import "./ERC20.sol";
import "../Utils/Ownable.sol";
import "../Math/SafeMath.sol";

import "./IBondingCurve.sol";
import "./BancorFormula.sol";
import "../Utils/MaxGasPrice.sol";

contract CurveBondedToken is IBondingCurve, BancorFormula, Ownable, MaxGasPrice, ERC20 {
    using SafeMath for uint256;

    // Use the same decimal places as ether.
    uint256 public scale = 10**18;
    uint256 public poolBalance = 1*scale;
    uint256 public reserveRatio;

    constructor(
        uint256 _reserveRatio
    ) public {
        reserveRatio = _reserveRatio;
        _mint(msg.sender, 1*scale);
    }

    function calculateCurvedMintReturn(uint256 _amount)
        public view returns (uint256 mintAmount)
    {
        return calculatePurchaseReturn(totalSupply(), poolBalance, uint32(reserveRatio), _amount);
    }

    function calculateCurvedBurnReturn(uint256 _amount)
        public view returns (uint256 burnAmount)
    {
        return calculateSaleReturn(totalSupply(), poolBalance, uint32(reserveRatio), _amount);
    }

    modifier validMint(uint256 _amount) {
        require(_amount > 0, "Amount must be non-zero!");
        _;
    }

    modifier validBurn(uint256 _amount) {
        require(_amount > 0, "Amount must be non-zero!");
        require(balanceOf(msg.sender) >= _amount, "Sender does not have enough tokens to burn.");
        _;
    }

    function _curvedMint(uint256 _deposit)
        internal
        validGasPrice
        validMint(_deposit)
        returns (uint256)
    {
        uint256 amount = calculateCurvedMintReturn(_deposit);
        _mint(msg.sender, amount);
        poolBalance = poolBalance.add(_deposit);
        emit CurvedMint(msg.sender, amount, _deposit);
        return amount;
    }

    function _curvedBurn(uint256 _amount)
        internal
        validGasPrice
        validBurn(_amount)
        returns (uint256)
    {
        uint256 reimbursement = calculateCurvedBurnReturn(_amount);
        poolBalance = poolBalance.sub(reimbursement);
        _burn(msg.sender, _amount);
        emit CurvedBurn(msg.sender, _amount, reimbursement);
        return reimbursement;
    }
}