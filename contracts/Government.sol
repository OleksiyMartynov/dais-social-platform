pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./BaseTCR.sol";
import "./TokenVoteStation.sol";

contract Government is BaseTCR {
    uint private proposalCount = 0;
    uint[] private proposalIds;
    mapping(uint=>Proposal) proposalMap; //mapping of voteId to Implementation data
    mapping(uint=>uint) implIdToProposalMap; //mapping of implementation id to proposal id
    struct Proposal {
        string ipfsHash;
        uint stake;
        address creator;
        mapping (address => uint) voterLockedAmounts;
        bool paidRewardOrPunishment;
        mapping(uint=>Implementation) implementationMap; //mapping of voteId to Implementation data
        mapping(uint=>ImplementationIndexData) rejectedImplementationMap; //mapping of voteId to ImplementationIndexData
        uint[]  acceptedIds;
        uint[]  rejectedIds;
        uint  pendingId;
    }
    struct ImplementationIndexData {
        uint id;
        uint index;
    }
    struct Implementation {
        string ipfsHash;
        uint stake;
        address creator;
        bool paidBackStake;
    }
    /**
     * @dev Sets the address of the settings contract
     */
    constructor (address _settingsContract) BaseTCR(_settingsContract) public {}

    function createProposal(string memory _ipfsHash, uint _amount)
        public
        payable
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount)
        returns(uint){
        require(_amount>0,"Creating a proposal requires a token stake");
        Proposal storage newProposal = proposalMap[proposalCount];
        newProposal.ipfsHash = _ipfsHash;
        newProposal.stake += _amount;
        newProposal.creator = msg.sender;
        newProposal.voterLockedAmounts[msg.sender] += _amount;

        proposalIds.push(proposalCount);
        ++proposalCount;
        return proposalCount - 1;
    }

    function addToProposal(uint _id, uint _amount)
        public
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount){
        require(_amount>0,"Adding to proposal requires a token stake");
        require(_id < proposalCount, "Invalid proposal id");
        Proposal storage proposal = proposalMap[_id];
        proposal.stake += _amount;
        proposal.voterLockedAmounts[msg.sender] += _amount;
    }

    function withdrawFromProposal(uint _id, uint _amount)
        public
        paysTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, proposalMap[_id].voterLockedAmounts[msg.sender]){
        require(_id < proposalCount, "Invalid proposal id");
        Proposal storage proposal = proposalMap[_id];
        proposal.stake -= _amount;
        proposal.voterLockedAmounts[msg.sender] -= _amount;
    }

    function createImplementation(string memory _ipfsHash, uint _id, uint _amount)
        public
        payable
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount)
        returns(uint){
        require(_id < proposalCount, "Invalid proposal id");
        TokenVoteStation voteStation = TokenVoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_GOVERNMENT"));
        uint voteId = voteStation.startVote();
        Proposal storage proposal = proposalMap[_id];
        Implementation storage implementation = proposal.implementationMap[voteId];
        implementation.ipfsHash = _ipfsHash;
        implementation.stake = _amount;
        implementation.creator = msg.sender;
        proposal.pendingId = voteId;
        implIdToProposalMap[voteId] = _id;
        return voteId;
    }

    function vote(uint _proposalId, bool _vote, uint _amount)
        public
        payable
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount){
        require(msg.value>0,"Voting requires funds to lock");
        TokenVoteStation voteStation = TokenVoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_GOVERNMENT"));
        Proposal storage proposal = proposalMap[_proposalId];
        require(proposal.stake>0, "Invalid proposal id");
        //todo: add function to vote with more tokens, now user can only vote once
        voteStation.vote(proposal.pendingId, _vote, msg.sender, _amount);
        proposal.voterLockedAmounts[msg.sender] += _amount;
    }

    function returnVoteFundsAndReward(uint _implementationId) public {
        TokenVoteStation voteStation = TokenVoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_GOVERNMENT"));
        voteStation.returnFunds(_implementationId, msg.sender);
        uint proposalId = implIdToProposalMap[_implementationId];
        (, , , , , bool majorityAccepted, bool isInMajority, uint forTotal, uint againstTotal) = voteStation.getVoterDetail(_implementationId, msg.sender);
        Proposal storage proposal = proposalMap[proposalId];
        require(proposal.stake>0, "Invalid debate id");
        if(proposal.paidRewardOrPunishment){//first time called
            //update pendingId
            if(!majorityAccepted){
                //punish implementation creator by taking their stake and redistributing it to dev address
            }else{
                //send reward to implementation creator
                //return implementation.stake
                if(isInMajority){
                    //add implementation to accepted list
                }else{
                    //add implementation to rejected list
                }
            }
        }
        if(!majorityAccepted){ //possibly dont need this if statement
            // should have majority reward?
        }else{
            // should have majority reward?
        }
    }

    function removeRejected(ImplementationIndexData memory item) private {

    }
}