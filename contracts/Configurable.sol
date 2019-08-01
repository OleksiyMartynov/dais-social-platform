pragma solidity ^0.5.8;

import "./Settings.sol";
import "./Ownable.sol";

contract Configurable is Ownable{
    Settings internal settings;
    function getSettingsAddress() public view returns(address){
        return address(settings);
    }
    function updateSettings(address _settingsContract)
    public
    onlyOwner()
    {
        settings = Settings(_settingsContract);
    }
}