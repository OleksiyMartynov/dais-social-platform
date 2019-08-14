pragma solidity ^0.5.8;
import "../Token/IERC20.sol";
/**
 * @dev Contract module which provides payment enforecement
*/
contract Priced {

    /**
     * @dev Throws if caller did not transfer correct amount
     */
    modifier costs(uint amount)
    {
        require(
            amount == msg.value,
            "Caller did not send correct amount"
        );
        _;
    }

    /**
     * @dev Throws if caller did not transfer correct amount of token
     */
    modifier costsTokens(address token, address from, uint amount)
    {
        require(
            IERC20(token).transferFrom(from, address(this), amount),
            "Caller did not send correct token amount"
        );
        _;
    }
}