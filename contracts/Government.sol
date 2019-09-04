pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./BaseTCR.sol";
import "./TokenVoteStation.sol";
import "./Token/IERC20.sol";
import "./Utils/Utils.sol";

/**
 * @dev Class for adding feature proposals to Government TCR.
 * Government TCR can grow indefinitely as the token holders approve feature implemention proposals
 * Inherits behaviours from {BaseTCR}
 */
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
        uint[]  acceptedIds;
        uint[]  rejectedIds;
        uint  pendingId;
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
    /**
     * @dev Starts voting period for feature proposal
     *
     * Restrictions:
     * - creator must provide a token stake (reward)
     */
    function createProposal(string memory _ipfsHash, uint _amount)
        public
        payable
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount)
        returns(uint){
        require(_amount>0,"Creating a proposal requires a token stake");
        proposalCount += 1;
        Proposal storage newProposal = proposalMap[proposalCount];
        newProposal.ipfsHash = _ipfsHash;
        newProposal.stake += _amount;
        newProposal.creator = msg.sender;
        newProposal.voterLockedAmounts[msg.sender] += _amount;

        proposalIds.push(proposalCount);
        return proposalCount - 1;
    }
    /**
     * @dev Increases reward amount for proposal implementation
     *
     * Restrictions:
     * - caller must provide a token stake (reward)
     */
    function addToProposal(uint _id, uint _amount)
        public
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount){
        require(_amount>0,"Adding to proposal requires a token stake");
        require(_id > 0 && _id <= proposalCount, "Invalid proposal id");
        Proposal storage proposal = proposalMap[_id];
        require(proposal.pendingId==0, "Cannot add during the vote period");
        proposal.stake += _amount;
        proposal.voterLockedAmounts[msg.sender] += _amount;
    }
    /**
     * @dev Increases reward amount for proposal implementation
     *
     * Restrictions:
     * - caller must provide a token stake (reward)
     */
    function withdrawFromProposal(uint _id, uint _amount)
        public
        paysTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount){
        require(_id > 0 && _id <= proposalCount, "Invalid proposal id");
        Proposal storage proposal = proposalMap[_id];
        require(proposal.pendingId==0, "Cannot withdraw during the vote period");
        uint totalLocked = proposal.voterLockedAmounts[msg.sender];
        require(totalLocked>=_amount, "Cannot withdraw more than deposited");
        proposal.stake -= _amount;
        proposal.voterLockedAmounts[msg.sender] -= _amount;
    }

    function createImplementation(string memory _ipfsHash, uint _id, uint _amount)
        public
        payable
        costsTokens(settings.getAddressValue("KEY_ADDRESS_TOKEN"), msg.sender, _amount)
        returns(uint){
        require(_id > 0 && _id <= proposalCount, "Invalid proposal id");
        require(_amount>0, "Stake should be greater than 0"); //consider minimum stake amount
        TokenVoteStation voteStation = TokenVoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_GOVERNMENT"));
        uint voteId = voteStation.startVote();
        Proposal storage proposal = proposalMap[_id];
        require(proposal.acceptedIds.length==0,"Implementation has already been accepted for this proposal");
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
        payable {
        require(_amount>0,"Voting requires tokens to lock");
        TokenVoteStation voteStation = TokenVoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_GOVERNMENT"));
        Proposal storage proposal = proposalMap[_proposalId];
        require(proposal.stake>0, "Invalid proposal id");
        //todo: consider adding function to vote with more tokens, now user can only vote once
        voteStation.vote(proposal.pendingId, _vote, msg.sender, _amount);
        proposal.voterLockedAmounts[msg.sender] += _amount;
    }

    function returnVoteFundsAndReward(uint _implementationId) public {
        TokenVoteStation voteStation = TokenVoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_GOVERNMENT"));
        voteStation.returnFunds(_implementationId, msg.sender);
        uint proposalId = implIdToProposalMap[_implementationId];
        (, , , , , bool majorityAccepted, , , ) = voteStation.getVoterDetail(_implementationId, msg.sender);
        Proposal storage proposal = proposalMap[proposalId];
        Implementation storage implementation = proposal.implementationMap[_implementationId];
        require(proposal.stake>0, "Invalid debate id");
        if(!implementation.paidBackStake){//first time called
            proposal.pendingId = 0;
            implementation.paidBackStake = true;
            uint amount = implementation.stake;
            if(!majorityAccepted){
                //add implementation to rejected list
                proposal.rejectedIds.push(_implementationId);
                //punish implementation creator by taking their stake and redistributing it to dev address
                implementation.stake = 0;
                IERC20(settings.getAddressValue("KEY_ADDRESS_TOKEN")).transfer(owner(), amount);
            }else{
                //add implementation to accepted list
                proposal.acceptedIds.push(_implementationId);
                //send reward to implementation creator
                //return implementation.stake
                uint reward = amount + proposal.stake;
                IERC20(settings.getAddressValue("KEY_ADDRESS_TOKEN")).transfer(implementation.creator, reward);
            }
        }
    }
    function getProposalIds(uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        return Utils.getPage(proposalIds, cursor, pageSize);
    }
    function getImplementationDetails(uint _implementationId)
        public
        view
        returns(
            string memory ipfsHash,
            uint stake,
            address creator,
            bool paidBackStake){
        uint proposalId = implIdToProposalMap[_implementationId];
        Proposal storage proposal = proposalMap[proposalId];
        Implementation storage implementation = proposal.implementationMap[_implementationId];
        ipfsHash = implementation.ipfsHash;
        stake = implementation.stake;
        creator = implementation.creator;
        paidBackStake = implementation.paidBackStake;
    }
    function getProposalDetails(uint _id)
        public
        view
        returns (string memory ipfsHash,
        uint stake,
        address creator,
        bool paidRewardOrPunishment,
        uint  pendingId){
            Proposal storage prop = proposalMap[_id];
            ipfsHash = prop.ipfsHash;
            stake = prop.stake;
            creator = prop.creator;
            paidRewardOrPunishment = prop.paidRewardOrPunishment;
            pendingId = prop.pendingId;
    }
    function getAcceptedImplementationIds(uint _id, uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        Proposal storage prop = proposalMap[_id];
        return Utils.getPage(prop.acceptedIds, cursor, pageSize);
    }

    function getRejectedImplementationIds(uint _id, uint cursor, uint pageSize)
        public
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        Proposal storage prop = proposalMap[_id];
        return Utils.getPage(prop.rejectedIds, cursor, pageSize);
    }
}