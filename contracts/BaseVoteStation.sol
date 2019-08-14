pragma solidity ^0.5.8;
import "./Utils/Timed.sol";
import "./Utils/Restricted.sol";
import "./Utils/Priced.sol";
import "./Utils/Liability.sol";

/**
 * @dev Class for starting polls, voting on polls, and finishing polls
 *
 * Inherits behaviours of {Timed} and {Restricted} classes
 */
contract BaseVoteStation is Timed, Restricted, Priced, Liability {
    uint  private  VOTE_DURATION;
    mapping(uint=>VoteData)  internal  voteDataMap; // maps voteId to VoteData
    uint  private  voteCount = 0;
    struct VoteData{
        uint startTime;
        mapping (address => uint) lockedAmounts;
        mapping (address => bool) votedFor;
        uint forTotal;
        uint againstTotal;
    }
    constructor(uint _voteDuration) public{
        VOTE_DURATION = _voteDuration;
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
        onlyAllowed()
        returns (uint){
            voteCount += 1;
            VoteData storage data = voteDataMap[voteCount];
            data.startTime = block.timestamp;
            emit VotingStarted(voteCount);
            return voteCount;
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
    function vote(uint _voteId, bool voteFor, address _voter, uint _amount)
        public
        payable
        onlyAllowed()
        onlyBefore(voteDataMap[_voteId].startTime+VOTE_DURATION){
            VoteData storage data = voteDataMap[_voteId];
            require(data.startTime != 0, "Invalid vote id");
            require(data.lockedAmounts[_voter]==0, "Already voted");
            data.lockedAmounts[_voter] += msg.value;
            if(voteFor){
                data.forTotal += msg.value;
                data.votedFor[_voter] = true;
            }else{
                data.againstTotal += msg.value;
                data.votedFor[_voter] = false;
            }
            emit Vote(_voteId, voteFor, _voter);
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
        onlyAllowed()
        onlyAfter(voteDataMap[_voteId].startTime+VOTE_DURATION){
            VoteData storage data = voteDataMap[_voteId];
            require(data.startTime != 0, "Invalid vote id");
            data.lockedAmounts[_voter] = 0;
            emit VoteRefund(_voteId, _voter);
        }
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
            uint againstTotal)
    {
        VoteData storage data = voteDataMap[_voteId];
        startTime = data.startTime;
        endTime = data.startTime+VOTE_DURATION;
        ongoing = now < data.startTime + VOTE_DURATION;
        if(now > data.startTime + VOTE_DURATION){ //only reveal the result after end time
            majorityAccepted = data.forTotal>data.againstTotal;
            forTotal = data.forTotal;
            againstTotal = data.againstTotal;
        }
    }

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
            uint againstTotal)
    {
        VoteData storage data = voteDataMap[_voteId];
        votedFor = data.votedFor[_voter];
        (startTime, endTime, ongoing, majorityAccepted, forTotal, againstTotal) = getVoteDetail(_voteId);
        if(now > data.startTime + VOTE_DURATION){ //only reveal the result after end time
            forTotal = data.forTotal;
            againstTotal = data.againstTotal;
            if((majorityAccepted && votedFor) || (!majorityAccepted && !votedFor)){
                isInMajority = true;
            }
        }
        lockedAmount = data.lockedAmounts[_voter];
    }

    /**
     * @dev Returns poll duration
     */
    function getVoteDuration() public view returns(uint duration){
        duration = VOTE_DURATION;
    }

    /**
     * @dev Returns total number of polls started
     */
    function getCount() public view returns(uint count){
        count = voteCount;
    }

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