pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./Utils/Ownable.sol";
import "./Utils/Configurable.sol";
/**
 * @dev Base class for implementing token curated registries that use a native token for voting.
 *
 * Inherits behaviours of {Ownable}, {Restricted}, {Configurable} classes
 */
contract BaseTCR is Ownable, Restricted, Configurable{

    /**
     * @dev Sets the initial address of the setting contract used by TCR
     */
    constructor (address _settingsContract) public {
        updateSettings(_settingsContract);
    }

    /**
     * @dev Casts vote for a specific _voteId
     *
     * Votes are equal to the value of the native token transfered
     *
     */

    function vote(uint _voteId, bool _vote) public payable;

    /**
     * @dev Returns funds locked during vote()
     *
     */
    function returnVoteFundsAndReward(uint _id) public;
}