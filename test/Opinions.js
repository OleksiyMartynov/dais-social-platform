const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_OPINIONS, KEY_ADDRESS_DEBATES, CONTRACT_FRACTIONS } = require("../constants");
const VoteStation = artifacts.require("VoteStation");
const Opinions = artifacts.require("Opinions");
const Debates = artifacts.require("Debates");
const Settings = artifacts.require("Settings");
const BN = web3.utils.BN;

contract("Opinions", accounts => {
    const MOCK_DEBATE_CREATOR_1 = accounts[1];
    const MOCK_DEBATE_CREATOR_1_STAKE = 10 * Math.pow(10, 11);

    const MOCK_OPINION_CREATOR_1 = accounts[2];
    const MOCK_OPINION_CREATOR_1_STAKE = 11 * Math.pow(10, 11);
    const MOCK_OPINION_CREATOR_2 = accounts[3];
    const MOCK_OPINION_CREATOR_2_STAKE = 12 * Math.pow(10, 11);

    const MOCK_VOTER_1 = accounts[4];
    const MOCK_VOTER_2 = accounts[5];
    const MOCK_VOTER_3 = accounts[6];
    const MOCK_VOTER_4 = accounts[7];
    const MOCK_VOTERS = [MOCK_VOTER_1,
        MOCK_VOTER_2,
        MOCK_VOTER_3,
        MOCK_VOTER_4];
    const MOCK_VOTER_1_VOTES = 15 * Math.pow(10, 6);
    const MOCK_VOTER_2_VOTES = 20 * Math.pow(10, 6);
    const MOCK_VOTER_3_VOTES = 16 * Math.pow(10, 6);
    const MOCK_VOTER_4_VOTES = 5 * Math.pow(10, 6);
    const MOCK_VOTER_VOTES = [MOCK_VOTER_1_VOTES,
        MOCK_VOTER_2_VOTES,
        MOCK_VOTER_3_VOTES,
        MOCK_VOTER_4_VOTES];

    const MOCK_VOTER_1_FOR = true;
    const MOCK_VOTER_2_FOR = false;
    const MOCK_VOTER_3_FOR = true;
    const MOCK_VOTER_4_FOR = false;
    const MOCK_VOTERS_FOR = [MOCK_VOTER_1_FOR,
        MOCK_VOTER_2_FOR,
        MOCK_VOTER_3_FOR,
        MOCK_VOTER_4_FOR];
    const MOCK_TAGS = ["TOPIC_1","TOPIC_2","TOPIC_3"];

    let DEBATE_ID;
    before("create debate for testing opinions", async () => {
        let meta = await Debates.deployed();
        console.log("\x1b[2m", "   ⏳ waiting for debate creation")
        await meta.create('0x123', ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });

        await meta.vote(1, true, { from: MOCK_DEBATE_CREATOR_1, value: 3 });
        await waitFor(VOTE_DURATION * 1000 + 1000);
        //await meta.settleCreatorAmounts(1);
        await meta.returnVoteFundsAndReward(1, { from: MOCK_DEBATE_CREATOR_1 });
        DEBATE_ID = (await meta.getAllDebateIds(true))[0].toNumber();
    });
    it("should have correct vote station address", async () => {
        let meta = await Settings.deployed();
        
        let voteStationAddress = await meta.getAddressValue(KEY_ADDRESS_VOTING_OPINIONS);
        assert.equal(
            voteStationAddress,
            VoteStation.address,
            "invalid deployment params"
        );
    });
    it("should have correct opinions contract address", async () => {
        let meta = await VoteStation.deployed();
        await Opinions.deployed();
        let hasAccess = await meta.hasAccess.call(Opinions.address);
        assert(
            hasAccess,
            "invalid deployment params"
        );
    });
    it("should not be able to create opinion with wrong staked amount", async () => {
        let meta = await Opinions.deployed();
        let failed = false;
        try {
            let tx = await meta.create(DEBATE_ID, "0x123", { from: MOCK_OPINION_CREATOR_1 });
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception")
        //check minimum stake amount. if first opinion under debate then min stake is 1/2 debate stake
        let failed2 = false;
        try {
            let tx = await meta.create(DEBATE_ID, "0x123", { from: MOCK_OPINION_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE/2 });
        } catch (ex) {
            failed2 = true;
        }
        assert(failed2, "should have thrown an exception")
    })
    it("should be able to create new opinion", async () => {
        let meta = await Opinions.deployed();
        let contractAddress = await meta.address;
        let initialBalance = new BN(await web3.eth.getBalance(contractAddress));
        let tx = await meta.create(DEBATE_ID, "0x123", { from: MOCK_OPINION_CREATOR_1, value: MOCK_OPINION_CREATOR_1_STAKE });
        let finalBalance = new BN(await web3.eth.getBalance(contractAddress));
        assert(tx.receipt.status, "transaction 1 failed");
        assert.equal(finalBalance.toString(), (initialBalance.add(new BN(MOCK_OPINION_CREATOR_1_STAKE))).toString(), "Invalid stake amount");
    })
    it("should not be able to create new opinion if an opinion is pending vote", async () => {
        let meta = await Opinions.deployed();
        let failed = false;
        try {
            let tx = await meta.create(DEBATE_ID, "0x123", { from: MOCK_OPINION_CREATOR_1, value: MOCK_OPINION_CREATOR_1_STAKE });
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception")
    })
    it("should not be able to vote on invalid opinion id", async () => {
        let meta = await Opinions.deployed();
        let failed = false;
        try {
            let tx = await meta.vote(33, MOCK_VOTER_1_FOR, { from: MOCK_VOTER_1, value: MOCK_VOTER_1_VOTES });
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception")
    })
    it("should not be able to vote without stake", async () => {
        let meta = await Opinions.deployed();
        let failed = false;
        try {
            let tx = await meta.vote(2, MOCK_VOTER_1_FOR, { from: MOCK_VOTER_1, value: 0 });
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception")
    })
    it("should be able to vote before end time", async () => {
        let meta = await Opinions.deployed();
        let contractAddress = await meta.address;
        for(let i = 0; i<MOCK_VOTERS.length; i++){
            let initialBalance = new BN(await web3.eth.getBalance(contractAddress));
            let tx = await meta.vote(2, MOCK_VOTERS_FOR[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            let finalBalance = new BN(await web3.eth.getBalance(contractAddress));
            assert(tx.receipt.status, "transaction failed");
            assert.equal(finalBalance.toString(), initialBalance.toString(), "Invalid stake amount");
        }
    })
    it("should not be able to vote twice", async () => {
        let meta = await Opinions.deployed();
        let failCount = 0;
        for(let i = 0; i<MOCK_VOTERS.length; i++){
            try{
                let tx = await meta.vote(2, MOCK_VOTERS_FOR[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            }catch(ex){
                ++failCount;
            }
        }
        assert.equal(failCount, MOCK_VOTERS.length, "all transactions should have failed");
    })
    it("should not return locked funds before vote end", async () => {
        let meta = await Opinions.deployed();
        let failCount = 0;
        for(let i = 0; i<MOCK_VOTERS.length; i++){
            try{
                let tx = await meta.returnVoteFundsAndReward(2, { from: MOCK_VOTERS[i] });
            }catch(ex){
                ++failCount;
            }
        }
        assert.equal(failCount, MOCK_VOTERS.length, "all transactions should have failed");
    })
    it("should have correct opinion details during vote period", async () => {
        let meta = await Opinions.deployed();
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getOpinionDetails.call(2, { from: MOCK_VOTERS[i] });
            const { debateId, ipfsHash, stake, creator, voterLockedAmount, paidRewardOrPunishment } = details;
            assert.equal(debateId, 1, "debate id does not match expected")
            assert.equal(ipfsHash, "0x123", "ipfs hashes dont match");
            assert.equal(stake, MOCK_OPINION_CREATOR_1_STAKE, "wrong stake amount");
            assert.equal(creator, MOCK_OPINION_CREATOR_1, "wrong opinion creator");
            assert.equal(voterLockedAmount, MOCK_VOTER_VOTES[i], "wrong locked amount");
            assert(!paidRewardOrPunishment, "should have not paid reward or punishment")
        }

        let voteContract = await VoteStation.deployed();
        const now = Date.now() / 1000;

        let opinion1Details = await voteContract.getVoteDetail(2);

        assert(opinion1Details.endTime > now, "end time should be in the future");
        assert.equal(opinion1Details.ongoing, true, "should be ongoing");
        assert.equal(opinion1Details.majorityAccepted, false, "always false untill endtime");
        assert.equal(opinion1Details.forTotal, 0, "always false untill endtime");
        assert.equal(opinion1Details.againstTotal, 0, "always false untill endtime");

        let opinion1RegistryDetails = await meta.getOpinionRegistryDetails(DEBATE_ID);
        assert.equal(opinion1RegistryDetails.topOpinionId, 0, "should be unset as its the first opinion");
        assert.equal(opinion1RegistryDetails.challangingOpinionId, 2, "wrong opinion id");
        assert.equal(opinion1RegistryDetails.oldTopOpinionIds.length, 0, "should be empty");
        assert.equal(opinion1RegistryDetails.rejectedOpinionsIds.length, 0, "should be empty");
    })
    it("should not be able to vote after vote time", async () => {
        console.log("\x1b[2m", "   ⏳ waiting for vote period end ");
        await waitFor(VOTE_DURATION * 1000 + 2000);
        let meta = await Opinions.deployed();
        let failed = false;
        try{
            let tx = await meta.vote(2, true, { from: accounts[9], value: 10000 });
        }catch(ex){
            failed = true;
        }
        assert(failed, "transaction should have failed");
    })
    it("should reward opinion creator", async () => {
        let meta = await Opinions.deployed();
        let debatesContractInstance = await Debates.deployed();
        let debatesContractAddress = await debatesContractInstance.address;
        let debateDetails = await debatesContractInstance.getDebateDetails.call(DEBATE_ID);
        const { stake } = debateDetails;
        assert.equal(MOCK_DEBATE_CREATOR_1_STAKE, stake, "stakes dont match")
        let debateContractInitialBalance = new BN(await web3.eth.getBalance(debatesContractAddress));
        let opinionCreatorInitialBalance = new BN(await web3.eth.getBalance(MOCK_OPINION_CREATOR_1));
        let debateCreatorInitialBalance = new BN(await web3.eth.getBalance(MOCK_DEBATE_CREATOR_1));
        await meta.settleCreatorAmounts(2);
        let debateContractFinalBalance = new BN(await web3.eth.getBalance(debatesContractAddress));
        let opinionCreatorFinalBalance = new BN(await web3.eth.getBalance(MOCK_OPINION_CREATOR_1));
        let debateCreatorFinalBalance = new BN(await web3.eth.getBalance(MOCK_DEBATE_CREATOR_1));

        let opinionRewardFraction = CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_DENOMINATOR;
        let firstOpinionCreatorReward = stake * opinionRewardFraction;

        assert.equal(debateContractInitialBalance.sub(new BN(firstOpinionCreatorReward)).toString(), debateContractFinalBalance.toString(), "Invalid debate contract balance");
        assert.equal(opinionCreatorInitialBalance.add(new BN(firstOpinionCreatorReward)).toString(), opinionCreatorFinalBalance.toString(), "Opinion creator didnt receive expected reward");
        assert.equal(debateCreatorInitialBalance.toString(), debateCreatorFinalBalance.toString(), "Debate creator balance should not change");
    })
    it("should not reward opinion creator if called second time", async () => {
        let meta = await Opinions.deployed();
        let debatesContractInstance = await Debates.deployed();
        let debatesContractAddress = await debatesContractInstance.address;
        let debateDetails = await debatesContractInstance.getDebateDetails.call(DEBATE_ID);
        const { stake } = debateDetails;
        assert.equal(MOCK_DEBATE_CREATOR_1_STAKE, stake, "stakes dont match")
        let debateContractInitialBalance = new BN(await web3.eth.getBalance(debatesContractAddress));
        let opinionCreatorInitialBalance = new BN(await web3.eth.getBalance(MOCK_OPINION_CREATOR_1));
        let debateCreatorInitialBalance = new BN(await web3.eth.getBalance(MOCK_DEBATE_CREATOR_1));
        await meta.settleCreatorAmounts(2);
        let debateContractFinalBalance = new BN(await web3.eth.getBalance(debatesContractAddress));
        let opinionCreatorFinalBalance = new BN(await web3.eth.getBalance(MOCK_OPINION_CREATOR_1));
        let debateCreatorFinalBalance = new BN(await web3.eth.getBalance(MOCK_DEBATE_CREATOR_1));

        assert.equal(debateContractInitialBalance.toString(), debateContractFinalBalance.toString(), "Invalid debate contract balance");
        assert.equal(opinionCreatorInitialBalance.toString(), opinionCreatorFinalBalance.toString(), "Opinion creator didnt receive expected reward");
        assert.equal(debateCreatorInitialBalance.toString(), debateCreatorFinalBalance.toString(), "Debate creator balance should not change");
    });
    it("should return locked funds after vote end", async () => {
        let meta = await Opinions.deployed();
        let voteContract = await VoteStation.deployed();
        let voterRewardFraction = CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_DENOMINATOR;
  
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let tx = await meta.returnVoteFundsAndReward(2, { from: MOCK_VOTERS[i] });
            let finalBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let details = await voteContract.getVoterDetail.call(2, MOCK_VOTERS[i]);
            const { majorityAccepted, forTotal, againstTotal } = details;
            let majorityReward = 0;
            if (majorityAccepted && MOCK_VOTERS_FOR[i]) {
                majorityReward = MOCK_OPINION_CREATOR_1_STAKE * voterRewardFraction * MOCK_VOTER_VOTES[i] / forTotal;
            } else if (!majorityAccepted && !MOCK_VOTERS_FOR[i]) {
                majorityReward = MOCK_OPINION_CREATOR_1_STAKE * voterRewardFraction * MOCK_VOTER_VOTES[i] / againstTotal;
            }
            let gasCost = await getGasCost(tx);
            
            assert.equal(initialBalance.add(new BN(MOCK_VOTER_VOTES[i])).add(new BN(majorityReward)).sub(new BN(gasCost)).toString(), finalBalance.toString(), "should have transfered locked amounts correctly");
        }
    })
    it("should have correct opinion details after vote period", async () => {
        let meta = await Opinions.deployed();
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getOpinionDetails.call(2, { from: MOCK_VOTERS[i] });
            const { debateId, ipfsHash, stake, creator, voterLockedAmount, paidRewardOrPunishment } = details;
            assert.equal(debateId, 1, "debate id does not match expected")
            assert.equal(ipfsHash, "0x123", "ipfs hashes dont match");
            assert.equal(stake, MOCK_OPINION_CREATOR_1_STAKE, "wrong stake amount");
            assert.equal(creator, MOCK_OPINION_CREATOR_1, "wrong opinion creator");
            assert.equal(voterLockedAmount, 0, "wrong locked amount");
            assert(paidRewardOrPunishment, "should have paid reward or punishment")
        }

        let voteContract = await VoteStation.deployed();
        const now = Date.now() / 1000;

        let opinion1Details = await voteContract.getVoteDetail(2);

        assert(opinion1Details.endTime < now, "end time should be in the past");
        assert.equal(opinion1Details.ongoing, false, "should not be ongoing");
        assert.equal(opinion1Details.majorityAccepted, true, "should be true");
        assert.equal(opinion1Details.forTotal, MOCK_VOTER_1_VOTES + MOCK_VOTER_3_VOTES, "wrong for amount total");
        assert.equal(opinion1Details.againstTotal, MOCK_VOTER_2_VOTES + MOCK_VOTER_4_VOTES, "wrong against amount total");

        let opinion1RegistryDetails = await meta.getOpinionRegistryDetails(DEBATE_ID);
        assert.equal(opinion1RegistryDetails.topOpinionId, 2, "wrong expected top opinion id");
        assert.equal(opinion1RegistryDetails.challangingOpinionId, 0, "wrong expected challanging opinion id");
        assert.equal(opinion1RegistryDetails.oldTopOpinionIds.length, 0, "oldTopOpinionIds list should be empty");
        assert.equal(opinion1RegistryDetails.rejectedOpinionsIds.length, 0, "rejectedOpinionsIds should be empty");
    })
    it("should not return locked funds if already returned", async () => {
        let meta = await Opinions.deployed();
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let tx = await meta.returnVoteFundsAndReward(2, { from: MOCK_VOTERS[i] });
            let finalBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let gasCost = await getGasCost(tx);
            assert.equal(initialBalance.sub(new BN(gasCost)).toString(), finalBalance.toString(), "should not transfer any amounts");
        }
    })
    it("should have correct debate contract", async () => {
        let meta = await Opinions.deployed();
        let settings = await Settings.deployed();
        let debatesContractAddress = await settings.getAddressValue(KEY_ADDRESS_DEBATES);
        let debatesContractInstance = await Debates.deployed();
        let address = await debatesContractInstance.address;
        assert.equal(address, debatesContractAddress, "Debates contract addresses did not match");
    })
    it("second opinion should fail if stake amount is less or equal to previous stake amount", async () => {
        let failed2 = false;
        let meta = await Opinions.deployed();
        try {
            let tx = await meta.create(DEBATE_ID, "0x456", { from: MOCK_OPINION_CREATOR_2, value: MOCK_OPINION_CREATOR_1_STAKE }); 
        } catch (ex) {
            failed2 = true;
        }
        assert(failed2, "should have thrown an exception")
    })
    it("should reward current top opinion correctly if proposed opinion is rejected", async () => {
        let meta = await Opinions.deployed();
        await meta.create(DEBATE_ID, "0x456", { from: MOCK_OPINION_CREATOR_2, value: MOCK_OPINION_CREATOR_2_STAKE });
        let voteAmount = 5 * Math.pow(10,6);
        await meta.vote(3, false, { from: MOCK_VOTER_1, value: voteAmount });
        console.log("\x1b[2m", "   ⏳ waiting for second opinion rejection vote")
        await waitFor(VOTE_DURATION * 1000 + 1000);

        let opinionCreatorRewardFraction = CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_DENOMINATOR;
        let voterRewardFraction = CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_DENOMINATOR;
        let opinion1RegistryDetails = await meta.getOpinionRegistryDetails(DEBATE_ID);
        let details = await meta.getOpinionDetails.call(opinion1RegistryDetails.topOpinionId);
        let topOpinionCreatorAddress = details.creator;
        let initialBalance = new BN(await web3.eth.getBalance(topOpinionCreatorAddress));
        let initialVoterBalance = new BN(await web3.eth.getBalance(MOCK_VOTER_1));
        
        await meta.settleCreatorAmounts(3);
        let txRefund = await meta.returnVoteFundsAndReward(3, { from: MOCK_VOTER_1});
        let gasCost = await getGasCost(txRefund);
        let finalBalance = new BN(await web3.eth.getBalance(topOpinionCreatorAddress));
        let finalVoterBalance = new BN(await web3.eth.getBalance(MOCK_VOTER_1));
        let voterReward = MOCK_OPINION_CREATOR_2_STAKE * voterRewardFraction;
        let opinionReward = MOCK_OPINION_CREATOR_2_STAKE * opinionCreatorRewardFraction;
        assert.equal(initialVoterBalance.add(new BN(voteAmount)).add(new BN(voterReward)).sub(new BN(gasCost)).toString(), finalVoterBalance.toString(), "Voter did not get correct reward");

        assert.equal(initialBalance.add(new BN(opinionReward)).toString(), finalBalance.toString(), "Top opinion did not get correct reward");
    })
    it("should create second debate", async () => {
        let meta = await Debates.deployed();
        console.log("\x1b[2m", "   ⏳ waiting for second debate creation")
        await meta.create('0x456', ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });
        let voteAmount = 5 * Math.pow(10,6);
        await meta.vote(4, true, { from: MOCK_DEBATE_CREATOR_1, value: voteAmount });
        await waitFor(VOTE_DURATION * 1000 + 1000);
        await meta.returnVoteFundsAndReward(4, { from: MOCK_DEBATE_CREATOR_1 });
        DEBATE_ID = (await meta.getAllDebateIds(true))[1].toNumber();
    })
    it("should reward debate creator correctly if first proposed opinion is rejected", async () => {
        let meta = await Opinions.deployed();
        let debatesContractInstance = await Debates.deployed();
        let details = await debatesContractInstance.getDebateDetails.call(DEBATE_ID);
        const { creator } = details;
        let tx = await meta.create(DEBATE_ID, "0x789", { from: MOCK_OPINION_CREATOR_2, value: MOCK_OPINION_CREATOR_2_STAKE });
        let voteAmount = 5 * Math.pow(10,6);
        await meta.vote(5, false, { from: MOCK_VOTER_1, value: voteAmount });
        console.log("\x1b[2m", "   ⏳ waiting for opinion rejection vote")
        await waitFor(VOTE_DURATION * 1000 + 1000);
        let voterRewardFraction = CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_DENOMINATOR;
        let debateCreatorRewardFraction = CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_DENOMINATOR; // reward if first opinion proposed is rejected
        let initialVoterBalance = new BN(await web3.eth.getBalance(MOCK_VOTER_1));
        let initialDebateCreatorBalance = new BN(await web3.eth.getBalance(creator));
        tx = await meta.returnVoteFundsAndReward(5, { from: MOCK_VOTER_1});
        let gasCost = await getGasCost(tx);
        let finalVoterBalance = new BN(await web3.eth.getBalance(MOCK_VOTER_1));
        let finalDebateCreatorBalance = new BN(await web3.eth.getBalance(creator));
        let voterReward = MOCK_OPINION_CREATOR_2_STAKE * voterRewardFraction;
        let debateCreatorReward = MOCK_OPINION_CREATOR_2_STAKE * debateCreatorRewardFraction;
        assert.equal(initialVoterBalance.add(new BN(voteAmount)).add(new BN(voterReward)).sub(new BN(gasCost)).toString(), finalVoterBalance.toString(), "Voter did not get correct reward");
        assert.equal(initialDebateCreatorBalance.add(new BN(debateCreatorReward)).toString(), finalDebateCreatorBalance.toString(), "Debate creator did not get correct reward");
    })
    it("should reward second opinion creator correctly if second proposed opinion is accepted", async () => {
        let meta = await Opinions.deployed();
        let debatesContractInstance = await Debates.deployed();
        let details = await debatesContractInstance.getDebateDetails.call(DEBATE_ID);
        const { creator } = details;
        //create first oppinion and accept it
        let tx = await meta.create(DEBATE_ID, "0x101", { from: MOCK_OPINION_CREATOR_1, value: MOCK_OPINION_CREATOR_1_STAKE });
        let voteAmount = 1;
        await meta.vote(6, true, { from: MOCK_VOTER_1, value: voteAmount });
        console.log("\x1b[2m", "   ⏳ waiting for first opinion vote")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        tx = await meta.returnVoteFundsAndReward(6, { from: MOCK_VOTER_1});
        //create second oppinion and accept it
        tx = await meta.create(DEBATE_ID, "0x101", { from: MOCK_OPINION_CREATOR_2, value: MOCK_OPINION_CREATOR_2_STAKE });
        voteAmount = 1;
        await meta.vote(7, true, { from: MOCK_VOTER_1, value: voteAmount });
        console.log("\x1b[2m", "   ⏳ waiting for second opinion vote")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        let voterRewardFraction = CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_MAJORITY_VOTER_REWARD_DENOMINATOR;
        let opinionCreatorRewardFraction = CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_DENOMINATOR;
        let debateCreatorRewardFraction = CONTRACT_FRACTIONS.DEBATE_CREATOR_REWARD_NUMERATOR / CONTRACT_FRACTIONS.DEBATE_CREATOR_REWARD_DENOMINATOR;
        //check reward punishment
        let initialOpinionCreatorBalance = new BN(await web3.eth.getBalance(MOCK_OPINION_CREATOR_2));
        let initialVoterBalance = new BN(await web3.eth.getBalance(MOCK_VOTER_1));
        let initialDebateCreatorBalance = new BN(await web3.eth.getBalance(creator));
        tx = await meta.returnVoteFundsAndReward(7, { from: MOCK_VOTER_1});
        let gasCost = await getGasCost(tx);
        let finalOpinionCreatorBalance = new BN(await web3.eth.getBalance(MOCK_OPINION_CREATOR_2));
        let finalVoterBalance = new BN(await web3.eth.getBalance(MOCK_VOTER_1));
        let finalDebateCreatorBalance = new BN(await web3.eth.getBalance(creator));
        let rewardVoter = MOCK_OPINION_CREATOR_2_STAKE * voterRewardFraction;
        let rewardOpinionCreator = MOCK_OPINION_CREATOR_1_STAKE * opinionCreatorRewardFraction;
        let rewardDebateCreator = MOCK_OPINION_CREATOR_1_STAKE * debateCreatorRewardFraction;
        assert.equal(initialOpinionCreatorBalance.add(new BN(rewardOpinionCreator)).toString(), finalOpinionCreatorBalance.toString(), "Second opinion creator did not get correct reward");
        assert.equal(initialDebateCreatorBalance.add(new BN(rewardDebateCreator)).toString(), finalDebateCreatorBalance.toString(), "Debate creators did not receive expected reward");
        assert.equal(initialVoterBalance.add(new BN(voteAmount)).add(new BN(rewardVoter)).sub(new BN(gasCost)).toString(), finalVoterBalance.toString(), "Voter did not get correct reward");
        
    })
    //todo test case where new opinion voting starts and old opinion no one called "settleCreatorAmounts"
})