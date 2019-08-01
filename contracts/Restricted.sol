pragma solidity ^0.5.8;

import "./Ownable.sol";

contract Restricted is Ownable{
    mapping(address=>bool) internal allowedAddressesMap;
    modifier onlyAllowed()
    {
        require(
            allowedAddressesMap[msg.sender],
            "Caller not authorized."
        );

        _;
    }
    
    modifier onlyBy(address _address)
    {
        require(
            allowedAddressesMap[_address],
            "Caller not authorized."
        );

        _;
    }

    modifier onlyStatic(address _address)
    {
        require(
            msg.sender == _address,
            "Caller not authorized."
        );

        _;
    }

    function grantAccess(address adr) public onlyOwner(){
        allowedAddressesMap[adr] = true;
    }

    function denyAccess(address adr) public onlyOwner(){
        allowedAddressesMap[adr] = false;
    }

    function hasAccess(address adr) public view returns(bool) {
        return allowedAddressesMap[adr];
    }
}