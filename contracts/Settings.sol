pragma solidity ^0.5.8;
import "./Utils/Ownable.sol";
/**
 * @dev Settings class providing storage for key value pairs of various types
 */
contract Settings is Ownable{
    mapping(string => uint) internal valuesMapping; //mapping key to value
    mapping(string => address) internal addressMapping; //mapping key to address
    mapping(string => string) internal stringMapping; //mapping key to string
    mapping(string => bool) internal flagMapping; //mapping key to booleans
    mapping(string => bytes) internal bytesMapping; //mapping key to bytes
    function setIntValue(string memory key, uint value)
    public
    onlyOwner()
    {
        valuesMapping[key] = value;
    }
    function setAddressValue(string memory key, address value)
    public
    onlyOwner()
    {
        addressMapping[key] = value;
    }
    function setStringValue(string memory key, string memory value)
    public
    onlyOwner()
    {
        stringMapping[key] = value;
    }
    function setBoolValue(string memory key, bool value)
    public
    onlyOwner()
    {
        flagMapping[key] = value;
    }
    function setBytesValue(string memory key, bytes memory value)
    public
    onlyOwner()
    {
        bytesMapping[key] = value;
    }
    function getIntValue(string memory key)
    public
    view
    returns (uint value)
    {
        return valuesMapping[key];
    }
    function getAddressValue(string memory key)
    public
    view
    returns (address value)
    {
        return addressMapping[key];
    }
    function getStringValue(string memory key)
    public
    view
    returns (string memory value)
    {
        return stringMapping[key];
    }
    function getBoolValue(string memory key)
    public
    view
    returns (bool value)
    {
        return flagMapping[key];
    }
    function getBytesValue(string memory key)
    public
    view
    returns (bytes memory value)
    {
        return bytesMapping[key];
    }
}