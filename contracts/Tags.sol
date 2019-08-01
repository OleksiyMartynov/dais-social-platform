pragma solidity ^0.5.8;

import "./Restricted.sol";
import "./Utils.sol";
import "./Settings.sol";
import "./Configurable.sol";

contract Tags is Restricted, Configurable {
    mapping(bytes32 => uint[]) private tagMapping; //mapping of hash of tag string to array of ids
    constructor (address _settingsContract) public {
        updateSettings(_settingsContract);
    }
    function addIdWithTag(string memory tag, uint id)
        public
        onlyStatic(settings.getAddressValue("KEY_ADDRESS_DEBATES"))
    {
        require(Utils.utfStringLength(tag)>=settings.getIntValue("MIN_TAG_LENGTH"),"Tag too short");
        require(Utils.utfStringLength(tag)<=settings.getIntValue("MAX_TAG_LENGTH"),"Tag too long");
        require(!Utils.stringStartsWith(tag, 0x23), "Tag cannot start with #");
        uint[] storage tags = tagMapping[keccak256(abi.encode(tag))];
        tags.push(id);
    }
    function getIdsForTag(string memory tag, uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(tagMapping[keccak256(abi.encode(tag))], cursor, pageSize);
    }
    function getIdsCountForTag(string memory tag)
        public
        view
        returns(uint count)
    {
        return tagMapping[keccak256(abi.encode(tag))].length;
    }
}