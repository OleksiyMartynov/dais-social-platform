pragma solidity ^0.5.8;

import "./Utils/Restricted.sol";
import "./Utils/Utils.sol";
import "./Settings.sol";
import "./Utils/Configurable.sol";

/**
 * @dev Class responsible for managing a list of string tags mapped to int ids
 * Inherits behaviours from {Restricted} and {Configurable}
 */
contract Tags is Restricted, Configurable {
    mapping(bytes32 => uint[]) private tagMapping; //mapping of hash of tag string to array of ids

    /**
     * @dev Sets the address of the settings contract
     */
    constructor (address _settingsContract) public {
        updateSettings(_settingsContract);
    }

    /**
     * @dev Saves tag for a specific id `id`
     *
     * Restrictions:
     * - must meet length requirements
     * - must not start with #
     */
    function addIdWithTag(string memory tag, uint id)
        public
        onlyStatic(settings.getAddressValue("KEY_ADDRESS_DEBATES"))
    {
        require(Utils.utfStringLength(tag)>=settings.getIntValue("MIN_TAG_LENGTH"),"Tag too short");
        require(Utils.utfStringLength(tag)<=settings.getIntValue("MAX_TAG_LENGTH"),"Tag too long");
        require(!Utils.stringStartsWith(tag, 0x23), "Tag cannot start with #");
        uint[] storage tags = tagMapping[keccak256(abi.encode(tag))];
        tags.push(id);
        emit TagSaved(tag, id);
    }

    /**
     * @dev Returns ids referenced by this tag
     */
    function getIdsForTag(string memory tag, uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(tagMapping[keccak256(abi.encode(tag))], cursor, pageSize);
    }

    /**
     * @dev Returns count of ids referenced by this tag
     */
    function getIdsCountForTag(string memory tag)
        public
        view
        returns(uint count)
    {
        return tagMapping[keccak256(abi.encode(tag))].length;
    }

    /**
     * @dev Emitted when a new tag is saved.
     */
    event TagSaved(string indexed tag, uint indexed id);
}