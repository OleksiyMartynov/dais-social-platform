pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./Ownable.sol";
import "./Configurable.sol";

contract BaseTCR is Ownable, Restricted, Configurable{
    constructor (address _settingsContract) public {
        updateSettings(_settingsContract);
    }
    function vote(uint _voteId, bool _vote) public payable;
    function returnVoteFundsAndReward(uint _id) public;
}