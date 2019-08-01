pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./BaseTCR.sol";
import "./Utils.sol";
import "./Tags.sol";

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
    constructor (address _settingsContract) BaseTCR( _settingsContract) public {
    }
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
        return voteId;
    }
    function vote(uint _id, bool _vote) public payable{
        require(msg.value>0,"Voting requires funds to lock");
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_DEBATES"));
        Debate storage debate = debatesMap[_id];
        require(debate.stake>0, "Invalid debate id");
        voteStation.vote.value(msg.value)(_id, _vote, msg.sender);
        debate.voterLockedAmounts[msg.sender] = msg.value;
    }
    function returnVoteFundsAndReward(uint _id) public {
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_DEBATES"));
        voteStation.returnFunds(_id, msg.sender);
        (, , , , , bool majorityAccepted, bool isInMajority, uint forTotal, uint againstTotal) = voteStation.getVoterDetail(_id, msg.sender);
        Debate storage debate = debatesMap[_id];
        require(debate.stake>0, "Invalid debate id");
        settleCreatorAmounts(_id);

        if(isInMajority){
            uint amount = debate.voterLockedAmounts[msg.sender];
            debate.voterLockedAmounts[msg.sender] = 0;
            uint rewardNumerator = settings.getIntValue("DEBATE_MAJORITY_VOTER_REWARD_NUMERATOR");
            uint rewardDenominator = settings.getIntValue("DEBATE_MAJORITY_VOTER_REWARD_DENOMINATOR");
            if(majorityAccepted){
                msg.sender.transfer(debate.stake * rewardNumerator / rewardDenominator * amount / forTotal);
            }else{
                msg.sender.transfer(debate.stake * rewardNumerator / rewardDenominator * amount / againstTotal);
            }
        }
    }
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
                address payable owner = address(uint160(owner()));
                owner.transfer(debate.stake * punishmentNumerator / punishmentDenominator);
            }else{
                acceptedIds.push(_id);
            }
            removePending(pendingDebatesMap[_id]);
        }
    }

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
    function getAcceptedDebateIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(acceptedIds, cursor, pageSize);
    }
    function getRejectedDebateIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(rejectedIds, cursor, pageSize);
    }
    function getPendingDebateIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(pendingIds, cursor, pageSize);
    }
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
    function onFirstOpinionAccepted(uint _id, address payable _creator, uint rewardNumerator, uint rewardDenominator)
        public
        onlyStatic(settings.getAddressValue("KEY_ADDRESS_OPINIONS"))
    {
        Debate storage debate = debatesMap[_id];
        if(!debate.paidFirstOpinionCreator){
            debate.paidFirstOpinionCreator = true;
            _creator.transfer(debate.stake * rewardNumerator / rewardDenominator);
        }
    }
    function removePending(PendingDebateData memory item) private {
        require(item.index < pendingIds.length, "Invalid pending debate index");
        uint last = pendingIds[pendingIds.length-1];
        pendingIds[item.index] = last;
        pendingDebatesMap[last].index = item.index;

        delete pendingIds[pendingIds.length-1];
        pendingIds.length--;
    }
}