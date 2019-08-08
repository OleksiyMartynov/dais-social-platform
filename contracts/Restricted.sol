pragma solidity ^0.5.8;

import "./Ownable.sol";
/**
 * @dev Contract module which provides restiction to callers that are able to call functions
*/
contract Restricted is Ownable{
    mapping(address=>bool) internal allowedAddressesMap;

    /**
     * @dev Throws if called by any account other than the allowed caller.
     */
    modifier onlyAllowed()
    {
        require(
            allowedAddressesMap[msg.sender],
            "Caller not authorized."
        );

        _;
    }

    /**
     * @dev Throws if called by any account other than the allowed caller.
     */
    modifier onlyBy(address _address)
    {
        require(
            allowedAddressesMap[_address],
            "Caller not authorized."
        );

        _;
    }

    /**
     * @dev Throws if called by any account other than the address provided in the `_address` variable.
     */
    modifier onlyStatic(address _address)
    {
        require(
            msg.sender == _address,
            "Caller not authorized."
        );

        _;
    }

    /**
     * @dev Adds an address to the list of allowed addresses
     *
     * Requirements:
     *
     * - caller must be contract owner.
     */
    function grantAccess(address adr) public onlyOwner(){
        allowedAddressesMap[adr] = true;
    }

    /**
     * @dev Removes an address from the list of allowed addresses
     *
     * Requirements:
     *
     * - caller must be contract owner.
     */
    function denyAccess(address adr) public onlyOwner(){
        allowedAddressesMap[adr] = false;
    }

    /**
     * @dev Checks if `adr` address param is granted access
     */
    function hasAccess(address adr) public view returns(bool) {
        return allowedAddressesMap[adr];
    }
}