pragma solidity ^0.5.8;

import "./VoteStation.sol";
import "./BaseTCR.sol";
import "./Debates.sol";

/**
* @dev Class for adding user opinions to the Opinion TCR
* Opinion TCR is a single item list for each accepted Debate into the Debate TCR
* Inherits behaviours from {BaseTCR}
*/
contract Opinions is BaseTCR  {
    enum OpinionState {NULL, PENDING_VOTE, VOTE_REJECTED, TOP, OLD_TOP}
    mapping(uint=>OpinionsRegistry) private  opinionsRegistryMap; //mapping of debateId to opinion registry data
    mapping(uint=>Opinion) private opinionsMap;
    struct OpinionsRegistry{
        uint challangingOpinionId;
        uint topOpinionId;
        uint[] oldTopOpinionIds;
        uint[] rejectedOpinionsIds;
    }
    struct Opinion {
        uint debateId;
        string ipfsHash;
        uint stake;
        address payable creator;
        OpinionState state;
        mapping (address => uint) voterLockedAmounts;
        bool paidRewardOrPunishment;
    }

    /**
     * @dev Sets the address of the settings contract
     */
    constructor (address _settingsContract) BaseTCR(_settingsContract) public {}

    /**
     * @dev Starts voting period for proposed opinion
     *
     * Restrictions:
     * - creator must provide a stake
     * - `_debateId` must be accepted to the Debate TCR
     * - no ongoing voted should exist for this debate `_debateId`
     * - creator must provide a stake larger than the previous top opinion
     */
    function create(uint _debateId, string memory _ipfsHash) public payable returns(uint){
        OpinionsRegistry storage opinionRegistry = opinionsRegistryMap[_debateId];
        //settle any pending opinion
        if(opinionRegistry.challangingOpinionId!=0){
            settleCreatorAmounts(opinionRegistry.challangingOpinionId);
        }
        require(msg.value>0,"Creating an opinion requires a stake");
        //check debateId is of debate thats approved
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_OPINIONS")); //consider custom vote duration
        (, , , , , bool majorityAccepted, , , ) = voteStation.getVoterDetail(_debateId, msg.sender);
        require(majorityAccepted, "Debate needs to be accepted by majority");
        //check if no current opinions pending votes
        require(opinionRegistry.challangingOpinionId == 0, "Existing opinion pending votes");
        //if first opinion under this debate check if msg.value is greater then 1/2 debate stake
        if(opinionRegistry.topOpinionId==0){
            Debates debates = Debates(settings.getAddressValue("KEY_ADDRESS_DEBATES"));
            (,uint stake,,,,,) = debates.getDebateDetails(_debateId);
            require(msg.value>stake/2, "invalid minimum stake requirements");
        }else{// if not first then check if msg.value is greater then topOpinion stake
            require(msg.value>opinionsMap[opinionRegistry.topOpinionId].stake, "invalid minimum stake requirements");
        }
        //start vote period
        uint voteId = voteStation.startVote();
        //store challanginf opinion data
        opinionRegistry.challangingOpinionId = voteId;
        Opinion storage opinion = opinionsMap[voteId];
        opinion.debateId = _debateId;
        opinion.ipfsHash = _ipfsHash;
        opinion.stake = msg.value;
        opinion.creator = msg.sender;
        opinion.state = OpinionState.PENDING_VOTE;
        emit OpinionCreated(_debateId, voteId, _ipfsHash);
        return voteId;
    }

    /**
     * @dev Users vote on specific opinion `_id`, to add to TCR or reject
     *
     * Restrictions:
     * - User must lock funds to vote
     * - `_id` must be a valid opinion id
     */
    function vote(uint _id, bool _vote) public payable{
        require(msg.value>0,"Voting requires funds to lock");
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_OPINIONS"));
        Opinion storage opinion = opinionsMap[_id];
        require(opinion.debateId != 0, "Invalid opinion id");
        voteStation.vote.value(msg.value)(_id, _vote, msg.sender, msg.value);
        opinion.voterLockedAmounts[msg.sender] = msg.value;
        emit OpinionVote(_id, _vote, msg.sender);
    }

    /**
     * @dev Users withdraw funds used for voting on specific opinion `_id`
     *
     * Restrictions:
     * - `_id` must be a valid opinion id
     *
     */
    function returnVoteFundsAndReward(uint _id) public {
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_OPINIONS"));
        voteStation.returnFunds(_id, msg.sender);
        (, , , , , bool majorityAccepted, bool isInMajority, uint forTotal, uint againstTotal) = voteStation.getVoterDetail(_id, msg.sender);
        Opinion storage opinion = opinionsMap[_id];
        require(opinion.debateId != 0, "Invalid opinion id");
        //if first time change opions states
        settleCreatorAmounts(_id);
        //if in voter majority then return reward
        uint reward = 0;
        if(isInMajority){
            //if opinion is accepted then return fraction of loser stake
            uint amount = opinion.voterLockedAmounts[msg.sender];
            opinion.voterLockedAmounts[msg.sender] = 0;
            uint rewardNumerator = settings.getIntValue("OPINION_MAJORITY_VOTER_REWARD_NUMERATOR");
            uint rewardDenominator = settings.getIntValue("OPINION_MAJORITY_VOTER_REWARD_DENOMINATOR");
            uint total = 0;
            if(majorityAccepted){
                total = forTotal;
            }else{//else if opinion is rejected the return voter locked amount
                total = againstTotal;
            }
            reward = opinion.stake * rewardNumerator/rewardDenominator * amount / total;
            msg.sender.transfer(reward);
        }
        emit OpinionVoteRefund(_id, msg.sender, reward, isInMajority);
    }

    /**
     * @dev Rewards and/or punishes opinion creators for specific opinion `_id`
     *
     * Restrictions:
     * - Called once per opinion that completed the voting period
     *
     */
    function settleCreatorAmounts(uint _id) public {
        VoteStation voteStation = VoteStation(settings.getAddressValue("KEY_ADDRESS_VOTING_OPINIONS"));
        voteStation.returnFunds(_id, msg.sender);
        (, , , , , bool majorityAccepted, , , ) = voteStation.getVoterDetail(_id, msg.sender);
        Opinion storage opinion = opinionsMap[_id];
        require(opinion.debateId != 0, "Invalid opinion id");
        //if first time change opions states
        //if first time function called since vote end and opinion creator was not rewarder/punished yet
        //if challangingOpinion is accepted and first call then move challangingOpinion to topOpinion
        OpinionsRegistry storage registry = opinionsRegistryMap[opinion.debateId];
        Debates debates = Debates(settings.getAddressValue("KEY_ADDRESS_DEBATES"));
        (,uint stake, address debateCreator,,,,) = debates.getDebateDetails(opinion.debateId);
        if(!opinion.paidRewardOrPunishment){ // true if this funtion is called first time after opinion is accepted
            opinion.paidRewardOrPunishment = true;
            registry.challangingOpinionId = 0; //reset for next challanger
            uint prevTopOpinionId = registry.topOpinionId;
            Opinion storage prevTopOpinion = opinionsMap[prevTopOpinionId];
            uint rewardNumerator = settings.getIntValue("OPINION_CREATOR_REWARD_NUMERATOR");
            uint rewardDenominator = settings.getIntValue("OPINION_CREATOR_REWARD_DENOMINATOR");
            uint loserStake = 0;
            emit OpinionVoteFinished(opinion.debateId, _id, majorityAccepted);
            if(majorityAccepted){
                opinion.state = OpinionState.TOP;
                //move old top opinionid  to old top opinions list
                if(prevTopOpinionId!=0){
                    registry.oldTopOpinionIds.push(prevTopOpinionId);
                }
                registry.topOpinionId = _id;
                //pay creator the prize
                //if first opinion then take debate reward
                if( prevTopOpinionId==0 ){
                    debates.onFirstOpinionAccepted(opinion.debateId, _id, opinion.creator, rewardNumerator, rewardDenominator);
                    //opinion.creator.transfer(stake * rewardNumerator / rewardDenominator);
                    loserStake = stake;
                }else{
                    uint amount = prevTopOpinion.stake * rewardNumerator / rewardDenominator;
                    opinion.creator.transfer(amount);
                    loserStake = prevTopOpinion.stake;
                    emit OpinionCreatorRewardedPunished(opinion.debateId, _id, opinion.creator, 0, prevTopOpinion.creator, amount);
                }
            }else{
                opinion.state = OpinionState.VOTE_REJECTED;
                //wrtie id  to rejected list
                registry.rejectedOpinionsIds.push(_id);
                // pay penalty
                if(registry.topOpinionId==0){// no top opinions, therefore pay debate creator
                    uint amount = opinion.stake * rewardNumerator / rewardDenominator;address(uint160(debateCreator));
                    (address(uint160(debateCreator))).transfer(amount);
                    emit OpinionCreatorRewardedPunished(opinion.debateId, _id, debateCreator, 1, opinion.creator, amount);
                }else{ // pay current top opinion creator
                    uint amount = opinion.stake * rewardNumerator / rewardDenominator;
                    prevTopOpinion.creator.transfer(amount);
                    emit OpinionCreatorRewardedPunished(opinion.debateId, _id, prevTopOpinion.creator, 0, opinion.creator, amount);
                }
                loserStake = opinion.stake;
            }
            settleOthers(opinion.debateId, _id, loserStake, debateCreator, prevTopOpinion);
        }
    }

    /**
     * @dev Rewards platform stakeholders and debate creator with fees earned from opinion battle
     */
    function settleOthers(uint debateId, uint id, uint loserStake, address debateCreator, Opinion memory prevTopOpinion) private{
        //payout remaining amounts to devs and debate creators
        // debate creator reward + dev fee + majority voter reward + winning opinion reward = 100% losers stake
        uint devFeeNumerator = settings.getIntValue("OPINION_DEV_REWARD_NUMERATOR");
        uint devFeeDenominator = settings.getIntValue("OPINION_DEV_REWARD_DENOMINATOR");
        address payable owner = address(uint160(owner()));
        uint devAmount = loserStake * devFeeNumerator / devFeeDenominator;
        owner.transfer(devAmount);
        emit DevFeePaid(debateId, id, owner, devAmount);

        uint debateCreatorRewardNumerator = settings.getIntValue("DEBATE_CREATOR_REWARD_NUMERATOR");
        uint debateCreatorRewardDenominator = settings.getIntValue("DEBATE_CREATOR_REWARD_DENOMINATOR");
        address payable payableDebateCreator = address(uint160(debateCreator));
        uint dcAmount = prevTopOpinion.stake * debateCreatorRewardNumerator / debateCreatorRewardDenominator;
        payableDebateCreator.transfer(dcAmount);
        emit OpinionDebateCreatorFeePaid(debateId, id, debateCreator, dcAmount);
    }

    /**
     * @dev Returns details for specific opinion `_id`
     */
    function getOpinionDetails(uint _id)
        public
        view
        returns(
            uint debateId,
            string memory ipfsHash,
            uint stake,
            address creator,
            uint voterLockedAmount,
            bool paidRewardOrPunishment)
    {
        Opinion storage opinion = opinionsMap[_id];
        debateId = opinion.debateId;
        ipfsHash = opinion.ipfsHash;
        stake = opinion.stake;
        creator = opinion.creator;
        voterLockedAmount = opinion.voterLockedAmounts[msg.sender];
        paidRewardOrPunishment = opinion.paidRewardOrPunishment;
    }

    /**
     * @dev Returns opinion registry details for specific debate `_id`
     */
    function getOpinionRegistryDetails(uint _debateId)
        public
        view
        returns(
            uint challangingOpinionId,
            uint topOpinionId,
            uint[] memory oldTopOpinionIds,
            uint[] memory rejectedOpinionsIds
        )
    {
        OpinionsRegistry memory opinionsReg = opinionsRegistryMap[_debateId];
        challangingOpinionId = opinionsReg.challangingOpinionId;
        topOpinionId = opinionsReg.topOpinionId;
        oldTopOpinionIds = opinionsReg.oldTopOpinionIds;
        rejectedOpinionsIds = opinionsReg.rejectedOpinionsIds;
    }

    /**
     * @dev Emitted when a new challanging opinion is created.
     */
    event OpinionCreated(uint indexed debateId, uint indexed opinionId, string ipfsHash);
    /**
     * @dev Emitted when a new vote for opinion is submitted.
     */
    event OpinionVote(uint indexed opinionId, bool vote, address indexed voter);
    /**
     * @dev Emitted when the opinion vote period completed and the address withdrew the funds
     * locked for voting.
     */
    event OpinionVoteRefund(uint indexed opinionId, address indexed voter, uint amount, bool isMajority);
    /**
     * @dev Emitted when the opinion vote period completed and the opinion is accepted to the TCR.
     */
    event OpinionVoteFinished(uint indexed debateId, uint indexed opinionId, bool accepted);
    /**
     * @dev Emitted when opinion creator stake is lost. `addressRewardType` 0 is opinionCreator, 1 is debate creator.
     */
    event OpinionCreatorRewardedPunished(uint debateId, uint indexed opinionId, address indexed addressRewarded,
            uint addressRewardedType,
            address indexed addressPuished,
            uint amount);
    /**
     * @dev Emitted when a dev fee is payed
     */
    event DevFeePaid(uint indexed debateId, uint indexed opininoId, address devAddress, uint amount);
    /**
     * @dev Emitted when a debate creator fee is payed
     */
    event OpinionDebateCreatorFeePaid(uint indexed debateId, uint indexed opininoId, address debateCreator, uint amount);
}