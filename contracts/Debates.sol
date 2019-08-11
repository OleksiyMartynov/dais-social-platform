pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./BaseTCR.sol";
import "./Utils/Utils.sol";
import "./Tags.sol";

/**
 * @dev Class for adding user debates to the Debate TCR.
 * Debate TCR can grow indefinitely as the users approve Debate proposals
 * Inherits behaviours from {BaseTCR}
 */
contract Debates is BaseTCR {
    uint[] private  acceptedIds;
    uint[] private  rejectedIds;
    uint[] private  pendingIds;
    mapping(uint=>Debate) debatesMap; //mapping of voteId to debate data
    mapping(uint=>PendingDebateData) pendingDebatesMap; //mapping of voteId to PendingDebateData
    struct Debate {
        string ipfsHash;
        uint stake;
        address creator;
        mapping (address => uint) voterLockedAmounts;
        bool paidRewardOrPunishment;
        bool paidFirstOpinionCreator;
        string[] tags;
    }
    struct PendingDebateData {
        uint id;
        uint index;
    }

    /**
     * @dev Sets the address of the settings contract
     */
    constructor (address _settingsContract) BaseTCR( _settingsContract) public {
    }

    /**
     * @dev Starts voting period for proposed debate topic
     *
     * Restrictions:
     * - creator must provide a stake
     */
    function create(string memory _ipfsHash, string memory tag1, string memory tag2, string memory tag3) public payable returns(uint){
        require(msg.value>0,"Creating a debate requires a stake");
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_DEBATES")); //consider custom vote duration
        uint voteId = voteStation.startVote();
        Debate storage debate = debatesMap[voteId];
        debate.ipfsHash = _ipfsHash;
        debate.stake = msg.value;
        debate.creator = msg.sender;
        Tags tags = Tags(settings.getAddressValue("KEY_ADDRESS_TAGS"));
        debate.tags = [tag1, tag2, tag3];
        tags.addIdWithTag(tag1, voteId);
        tags.addIdWithTag(tag2, voteId);
        tags.addIdWithTag(tag3, voteId);
        pendingIds.push(voteId);
        pendingDebatesMap[voteId] = PendingDebateData(voteId, pendingIds.length-1);
        emit DebateCreated(voteId);
        return voteId;
    }

    /**
     * @dev Users vote on a specific debate id to add to TCR or reject
     *
     * Restrictions:
     * - votes must lock funds to vote
     * - `_id` must be a valid debate id
     */
    function vote(uint _id, bool _vote) public payable{
        require(msg.value>0,"Voting requires funds to lock");
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_DEBATES"));
        Debate storage debate = debatesMap[_id];
        require(debate.stake>0, "Invalid debate id");
        voteStation.vote.value(msg.value)(_id, _vote, msg.sender);
        debate.voterLockedAmounts[msg.sender] = msg.value;
        emit DebateVote(_id, _vote, msg.sender);
    }

    /**
     * @dev Users withdraw funds used for voting on specific debate `_id`
     *
     * Restrictions:
     * - `_id` must be a valid debate id
     */
    function returnVoteFundsAndReward(uint _id) public {
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_DEBATES"));
        voteStation.returnFunds(_id, msg.sender);
        (, , , , , bool majorityAccepted, bool isInMajority, uint forTotal, uint againstTotal) = voteStation.getVoterDetail(_id, msg.sender);
        Debate storage debate = debatesMap[_id];
        require(debate.stake>0, "Invalid debate id");
        settleCreatorAmounts(_id);
        uint reward = 0;
        if(isInMajority){
            uint amount = debate.voterLockedAmounts[msg.sender];
            debate.voterLockedAmounts[msg.sender] = 0;
            uint rewardNumerator = settings.getIntValue("DEBATE_MAJORITY_VOTER_REWARD_NUMERATOR");
            uint rewardDenominator = settings.getIntValue("DEBATE_MAJORITY_VOTER_REWARD_DENOMINATOR");
            uint total = 0;
            if(majorityAccepted){
                total = forTotal;
            }else{
                total = againstTotal;
            }
            reward = debate.stake * rewardNumerator / rewardDenominator * amount / total;
            msg.sender.transfer(reward);
        }
        emit DebateVoteRefund(_id, msg.sender, reward, majorityAccepted);
    }

    /**
     * @dev Rewards and/or punishes debate creators for specific debate `_id`
     *
     * Restrictions:
     * - Called once per debate that completed the voting period
     *
     */
    function settleCreatorAmounts(uint _id) public {
        //if first time function called since vote end and debate creator was not rewarder/punished yet
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_DEBATES"));
        voteStation.returnFunds(_id, msg.sender);
        (, , , , , bool majorityAccepted, , , ) = voteStation.getVoterDetail(_id, msg.sender);
        Debate storage debate = debatesMap[_id];
        require(debate.stake>0, "Invalid debate id");
        if(!debate.paidRewardOrPunishment){
            debate.paidRewardOrPunishment = true;
            if(!majorityAccepted){
                uint punishmentNumerator = settings.getIntValue("DEBATE_CREATOR_PUNISHMENT_NUMERATOR");
                uint punishmentDenominator = settings.getIntValue("DEBATE_CREATOR_PUNISHMENT_DENOMINATOR");
                rejectedIds.push(_id);
                uint amount = debate.stake * punishmentNumerator / punishmentDenominator;
                (address(uint160(owner()))).transfer(amount);
                emit DebateDevFeePaid(_id, owner(), amount);
            }else{
                acceptedIds.push(_id);
            }
            removePending(pendingDebatesMap[_id]);
        }
    }

    /**
     * @dev Called once first opinion is accepted under this debate. Pays out reward.
     */
    function onFirstOpinionAccepted(uint _id, uint _opinionId, address payable _creator, uint rewardNumerator, uint rewardDenominator)
        public
        onlyStatic(settings.getAddressValue("KEY_ADDRESS_OPINIONS"))
    {
        Debate storage debate = debatesMap[_id];
        if(!debate.paidFirstOpinionCreator){
            debate.paidFirstOpinionCreator = true;
            uint amount = debate.stake * rewardNumerator / rewardDenominator;
            _creator.transfer(amount);
            emit FirstOpinionAccepted(_id, _opinionId, _creator, amount);
        }
    }
    /**
     * @dev Returns debate details
     */
    function getDebateDetails(uint _id)
        public
        view
        returns(
            string memory ipfsHash,
            uint stake,
            address creator,
            uint voterLockedAmount,
            string memory tag1,
            string memory tag2,
            string memory tag3)
    {
        Debate storage debate = debatesMap[_id];
        ipfsHash = debate.ipfsHash;
        stake = debate.stake;
        creator = debate.creator;
        voterLockedAmount = debate.voterLockedAmounts[msg.sender];
        tag1 = debate.tags[0];
        tag2 = debate.tags[1];
        tag3 = debate.tags[2];
    }

    /**
     * @dev Returns all debates in the Debate TCR
     */
    function getAcceptedDebateIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(acceptedIds, cursor, pageSize);
    }

    /**
     * @dev Returns all debates rejected by users
     */
    function getRejectedDebateIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(rejectedIds, cursor, pageSize);
    }

    /**
     * @dev Returns all debates pending votes
     */
    function getPendingDebateIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(pendingIds, cursor, pageSize);
    }

    /**
     * @dev Returns all debates either accepted or rejected
     */
    function getAllDebateIds(bool accepted)
        public
        view
        returns(uint[] memory values)
    {
        if(accepted){
            values = acceptedIds;
        }else{
            values = rejectedIds;
        }
    }

    /**
     * @dev Returns count of all debates either accepted or rejected
     */
    function getDebateCount(bool accepted)
        public
        view
        returns(uint count)
    {
        if(accepted){
            count = acceptedIds.length;
        }else{
            count = rejectedIds.length;
        }
    }
    /**
     * @dev Utility function to clear pending debate list
     */
    function removePending(PendingDebateData memory item) private {
        require(item.index < pendingIds.length, "Invalid pending debate index");
        uint last = pendingIds[pendingIds.length-1];
        pendingIds[item.index] = last;
        pendingDebatesMap[last].index = item.index;

        delete pendingIds[pendingIds.length-1];
        pendingIds.length--;
    }
    /**
     * @dev Emitted when a new challanging debate is created.
     */
    event DebateCreated(uint indexed debateId);
    /**
     * @dev Emitted when a new vote for debate is submitted.
     */
    event DebateVote(uint indexed debateId, bool vote, address indexed voter);
    /**
     * @dev Emitted when the debate vote period completed and the address withdrew the funds
     * locked for voting.
     */
    event DebateVoteRefund(uint indexed debateId, address indexed voter, uint amount, bool isMajority);
    /**
     * @dev Emitted when a dev fee is payed
     */
    event DebateDevFeePaid(uint indexed debateId, address devAddress, uint amount);
    /**
     * @dev Emitted when a first opinion is accepted for a debate
     */
    event FirstOpinionAccepted(uint indexed debateId, uint indexed opinionId, address creator, uint amount);
}