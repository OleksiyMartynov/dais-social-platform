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
        emit SettingUint(key, value);
    }
    function setAddressValue(string memory key, address value)
    public
    onlyOwner()
    {
        addressMapping[key] = value;
        emit SettingAddress(key, value);
    }
    function setStringValue(string memory key, string memory value)
    public
    onlyOwner()
    {
        stringMapping[key] = value;
        emit SettingString(key, value);
    }
    function setBoolValue(string memory key, bool value)
    public
    onlyOwner()
    {
        flagMapping[key] = value;
        emit SettingBool(key, value);
    }
    function setBytesValue(string memory key, bytes memory value)
    public
    onlyOwner()
    {
        bytesMapping[key] = value;
        emit SettingBytes(key, value);
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

    /**
     * @dev Emitted when a string setting is set.
     */
    event SettingString(string indexed key, string value);
    /**
     * @dev Emitted when a uint setting is set.
     */
    event SettingUint(string indexed key, uint value);
    /**
     * @dev Emitted when a address setting is set.
     */
    event SettingAddress(string indexed key, address value);
    /**
     * @dev Emitted when a bool setting is set.
     */
    event SettingBool(string indexed key, bool value);
    /**
     * @dev Emitted when a bytes setting is set.
     */
    event SettingBytes(string indexed key, bytes indexed value);
}