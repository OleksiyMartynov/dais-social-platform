pragma solidity ^0.5.8;

import "./Token/IERC20.sol";
import "./BaseVoteStation.sol";
import "./Utils/Timed.sol";
import "./Utils/Restricted.sol";
import "./Utils/Ownable.sol";

/**
 * @dev Class for starting and ending governance votes
 *
 * Inherits behaviours of {Timed} and {Restricted} classes
 */
contract TokenVoteStation is BaseVoteStation {
    IERC20 public token;
    /**
     * @dev Initialized with value for length of poll duration
     */
    constructor (uint _voteDuration, address _token) BaseVoteStation(_voteDuration) public {
        token = IERC20(_token);
    }

    /**
     * @dev Starts a unique poll
     *
     * Requirements:
     *
     * - caller must be granted permission to call this function.
     */
    function startVote()
        public
        payable
        returns (uint)
    {
        return super.startVote();
    }

    /**
     * @dev Records a vote for a specific vote id `_voteId` where votes are equal to the transaction value
     *
     * Requirements:
     *
     * - caller must be granted permission to call this function.
     * - current time must be before poll period end
     * - `_voter` address can only vote once, and then cannot change their vote
     * - `_voteId` must be valid poll id
     */
    function vote(uint _voteId, bool _voteFor, address _voter, uint _amount)
        public
        payable
        costsTokens(address(token), _voter, _amount)
    {
        super.vote(_voteId, _voteFor, _voter, _amount);
    }

    /**
     * @dev Allows voter to withdraw their locked funds used for voting
     *
     * Requirements:
     *
     * - caller must be granted permission to call this function.
     * - current time must ne after poll period end
     * - `_voteId` must be valid poll id
     */
    function returnFunds(uint _voteId, address payable _voter)
        public
        paysTokens(address(token), _voter, voteDataMap[_voteId].lockedAmounts[_voter])
    {
        super.returnFunds(_voteId, _voter);
    }

    /**
     * @dev Returns token contract address
     */
    function getTokenContractAddress() public view returns(address tokenContractAddress){
        tokenContractAddress = address(token);
    }
}