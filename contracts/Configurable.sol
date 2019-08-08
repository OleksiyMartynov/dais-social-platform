pragma solidity ^0.5.8;

import "./Settings.sol";
import "./Ownable.sol";

/**
 * @dev Base class for providing access to settings contract and ability to upgrade the settings contract address
 *
 * Inherits behaviours of {Ownable} class
*/
contract Configurable is Ownable{
    Settings internal settings;
    /**
     * @dev Returns settings contract address
     */
    function getSettingsAddress() public view returns(address){
        return address(settings);
    }
    /**
     * @dev Changes settings contract address
     *
     * Requirements:
     *
     * - caller must be contract owner.
     */
    function updateSettings(address _settingsContract)
    public
    onlyOwner()
    {
        settings = Settings(_settingsContract);
    }
}