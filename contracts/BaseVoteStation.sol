pragma solidity ^0.5.8;
import "./Utils/Timed.sol";
import "./Utils/Restricted.sol";

/**
 * @dev Class for starting polls, voting on polls, and finishing polls
 *
 * Inherits behaviours of {Timed} and {Restricted} classes
 */
contract BaseVoteStation is Timed, Restricted {

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
        returns (uint);

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
    function vote(uint _voteId, bool voteFor, address _voter, uint _amount)
        public
        payable;

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
        public;
    /**
     * @dev Returns vote details for poll id `_voteId`
     */
    function getVoteDetail(uint _voteId)
        public
        view
        returns(uint startTime,
            uint endTime,
            bool ongoing,
            bool majorityAccepted,
            uint forTotal,
            uint againstTotal);

    /**
     * @dev Return vote details for voter `_voter` address for poll id `_voteId`
     */
    function getVoterDetail(uint _voteId, address _voter)
        public
        view
        returns(uint startTime,
            uint endTime,
            bool ongoing,
            uint lockedAmount,
            bool votedFor,
            bool majorityAccepted,
            bool isInMajority,
            uint forTotal,
            uint againstTotal);

    /**
     * @dev Returns poll duration
     */
    function getVoteDuration() public view returns(uint duration);

    /**
     * @dev Returns total number of polls started
     */
    function getCount() public view returns(uint count);

    /**
     * @dev Emitted when a new voting begins.
     */
    event VotingStarted(uint indexed voteId);

    /**
     * @dev Emitted when an address submits a vote. `voteFor` is the addresses vote.
     */
    event Vote(uint indexed voteId, bool voteFor, address indexed voter);

    /**
     * @dev Emitted when the vote period completed and the address withdrew the funds
     * locked for voting.
     */
    event VoteRefund(uint indexed voteId, address indexed voter);

}