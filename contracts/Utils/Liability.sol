pragma solidity ^0.5.8;
import "../Token/IERC20.sol";
/**
 * @dev Contract module which provides payment enforecement
*/
contract Liability {

    /**
     * @dev Throws if caller did not transfer correct amount
     */
    modifier pays(address payable receipient, uint amount)
    {
        _;
        receipient.transfer(amount);
    }

    /**
     * @dev Throws if caller did not transfer correct amount of token
     */
    modifier paysTokens(address token, address receipient, uint amount)
    {
        _;
        require(IERC20(token).transfer(receipient, amount),"Unable to send token amount");
    }
}