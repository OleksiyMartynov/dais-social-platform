const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_DEBATES, KEY_ADDRESS_OPINIONS, CONTRACT_FRACTIONS } = require("../constants");
const VoteStation = artifacts.require("VoteStation");
const Debates = artifacts.require("Debates");
const Opinions = artifacts.require("Opinions");
const Tags = artifacts.require("Tags");
const Settings = artifacts.require("Settings");
const BN = web3.utils.BN;

contract("Debates", accounts => {
    const MOCK_OPINION_CONTRACT = accounts[6];
    const MOCK_DEBATE_CREATOR_1 = accounts[0];
    const MOCK_DEBATE_CREATOR_1_STAKE = 10 * Math.pow(10, 11);
    const MOCK_DEBATE_CREATOR_2 = accounts[1];
    const MOCK_DEBATE_CREATOR_2_STAKE = 10 * Math.pow(10, 11);
    const MOCK_VOTER_1 = accounts[2];
    const MOCK_VOTER_2 = accounts[3];
    const MOCK_VOTER_3 = accounts[4];
    const MOCK_VOTER_4 = accounts[5];
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
    it("should have correct vote station address", async () => {
        let meta = await Settings.deployed();
        
        let voteStationAddress = await meta.getAddressValue(KEY_ADDRESS_VOTING_DEBATES);
        assert.equal(
            voteStationAddress,
            VoteStation.address,
            "invalid deployment params"
        );
    });
    it("should have correct debates contract address", async () => {
        let meta = await VoteStation.deployed();
        await Debates.deployed();
        let hasAccess = await meta.hasAccess.call(Debates.address);
        assert(
            hasAccess,
            "invalid deployment params"
        );
    });
    it("should not be able to create debate without staked amount", async () => {
        let meta = await Debates.deployed();
        let failed = false;
        try {
            let tx = await meta.create("0x123", ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1 });
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception")
    })
    it("should be able to create new debates", async () => {
        let meta = await Debates.deployed();
        let contractAddress = await meta.address;
        let initialBalance = new BN(await web3.eth.getBalance(contractAddress));
        let tx = await meta.create("0x123", ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });
        let finalBalance = new BN(await web3.eth.getBalance(contractAddress));
        assert(tx.receipt.status, "transaction 1 failed");
        assert.equal(finalBalance.toString(), (initialBalance.add(new BN(MOCK_DEBATE_CREATOR_1_STAKE))).toString(), "Invalid stake amount");

        initialBalance = new BN(await web3.eth.getBalance(contractAddress));
        let tx2 = await meta.create("0x456", ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_2, value: MOCK_DEBATE_CREATOR_2_STAKE });
        finalBalance = new BN(await web3.eth.getBalance(contractAddress));
        assert(tx2.receipt.status, "transaction 2 failed");
        assert.equal(finalBalance.toString(), (initialBalance.add(new BN(MOCK_DEBATE_CREATOR_2_STAKE))).toString(), "Invalid stake amount");
    })
    it("should not be able to vote on invalid debate id", async () => {
        let meta = await Debates.deployed();
        let transactionSuccess = false;
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let invalidId = 333 + i;
            try {
                let tx = await meta.vote(invalidId, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            } catch (ex) {
                continue;
            }
            transactionSuccess = true;
        }
        assert(!transactionSuccess, "No transactions should  succeed")
    })
    it("should not be able to vote without stake", async () => {
        let meta = await Debates.deployed();
        let transactionSuccess = false;
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            try {
                let tx = await meta.vote(1, MOCK_VOTERS_FOR[i], 0, { from: MOCK_VOTERS[i], value: 0 });
            } catch (ex) {
                continue;
            }
            transactionSuccess = true;
        }
        assert(!transactionSuccess, "No transactions should succeed")
    })
    it("should be able to vote before end time", async () => {
        let meta = await Debates.deployed();
        let settingsContractInstance = await Settings.deployed();

        let voteContractAddress = await settingsContractInstance.getAddressValue(KEY_ADDRESS_VOTING_DEBATES);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(voteContractAddress));
            let tx = await meta.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            assert(tx.receipt.status, "transaction failed");
            let finalBalance = new BN(await web3.eth.getBalance(voteContractAddress));
            let contractBalanceDiff = finalBalance.sub(initialBalance);
            let total = new BN(MOCK_VOTER_VOTES[i]);
            assert.equal(contractBalanceDiff.toString(),
                total.toString(),
                "Amount wasnt correctly deduced");
        }
        let votesAgains = 10 * Math.pow(10, 6);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(voteContractAddress));

            let tx = await meta.vote(2, false, votesAgains, { from: MOCK_VOTERS[i], value: votesAgains });
            assert(tx.receipt.status, "transaction failed");
            let finalBalance = new BN(await web3.eth.getBalance(voteContractAddress));
            let contractBalanceDiff = finalBalance.sub(initialBalance);
            let total = new BN(votesAgains);
            assert.equal(contractBalanceDiff.toString(),
                total.toString(),
                "Amount wasnt correctly deduced");
        }
    })
    it("should not be able to vote twice", async () => {
        let meta = await Debates.deployed();
        let transactionSuccess = false;
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            try {
                let tx = await meta.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            } catch (ex) {
                continue;
            }
            try {
                let tx2 = await meta.vote(2, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            } catch (ex) {
                continue;
            }
            transactionSuccess = true;
        }
        assert(!transactionSuccess, "No transactions should succeed")
    })
    it("should not return locked funds before vote end", async () => {
        let meta = await Debates.deployed();
        let transactionSuccess = false;
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            try {
                let tx = await meta.returnVoteFundsAndReward(1);
            } catch (ex) {
                continue;
            }
            try {
                let tx2 = await meta.returnVoteFundsAndReward(2);
            } catch (ex) {
                continue;
            }
            transactionSuccess = true;
        }
        assert(!transactionSuccess, "No transactions should succeed")
    })
    it("should have correct debate details during vote period", async () => {
        let meta = await Debates.deployed();
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getDebateDetails.call(1, { from: MOCK_VOTERS[i] });
            const { ipfsHash, stake, creator, voterLockedAmount, tag1, tag2, tag3 } = details;
            assert.equal(ipfsHash, "0x123", "ipfs hashes dont match");
            assert.equal(stake, MOCK_DEBATE_CREATOR_1_STAKE, "wrong stake amount");
            assert.equal(creator, MOCK_DEBATE_CREATOR_1, "wrong debate creator");
            assert.equal(voterLockedAmount, MOCK_VOTER_VOTES[i], "wrong locked amount");
            assert.equal(tag1, MOCK_TAGS[0], "tag didnt match expected");
            assert.equal(tag2, MOCK_TAGS[1], "tag didnt match expected");
            assert.equal(tag3, MOCK_TAGS[2], "tag didnt match expected");
        }
        let votesAgains = 10 * Math.pow(10, 6);
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getDebateDetails.call(2, { from: MOCK_VOTERS[i] });
            const { ipfsHash, stake, creator, voterLockedAmount, tag1, tag2, tag3 } = details;
            assert.equal(ipfsHash, "0x456", "ipfs hashes dont match");
            assert.equal(stake, MOCK_DEBATE_CREATOR_1_STAKE, "wrong stake amount");
            assert.equal(creator, MOCK_DEBATE_CREATOR_1, "wrong debate creator");
            assert.equal(voterLockedAmount, votesAgains, "wrong locked amount");
            assert.equal(tag1, MOCK_TAGS[0], "tag didnt match expected");
            assert.equal(tag2, MOCK_TAGS[1], "tag didnt match expected");
            assert.equal(tag3, MOCK_TAGS[2], "tag didnt match expected");
        }

        let voteContract = await VoteStation.deployed();
        const now = Date.now() / 1000;

        let debate1Details = await voteContract.getVoteDetail(1);

        assert(debate1Details.endTime > now, "end time should be in the future");
        assert.equal(debate1Details.ongoing, true, "should be ongoing");
        assert.equal(debate1Details.majorityAccepted, false, "always false untill endtime");
        assert.equal(debate1Details.forTotal, 0, "always false untill endtime");
        assert.equal(debate1Details.againstTotal, 0, "always false untill endtime");

        let debate2Details = await voteContract.getVoteDetail(2);
        assert(debate2Details.endTime > now, "end time should be in the future");
        assert.equal(debate2Details.ongoing, true, "should be ongoing");
        assert.equal(debate2Details.majorityAccepted, false, "always false untill endtime");
        assert.equal(debate2Details.forTotal, 0, "always false untill endtime");
        assert.equal(debate2Details.againstTotal, 0, "always false untill endtime");

        let pendingDebateData = await meta.getPendingDebateIds(0, 10);
        assert.equal(pendingDebateData.values[0].toString(), "1", "Invalid pending debate id");
    })
    it("should not be able to vote after vote time", async () => {
        console.log("\x1b[2m", "   ⏳ waiting for vote period end ")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        let meta = await Debates.deployed();
        let transactionSuccess = false;
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            try {
                let tx = await meta.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            } catch (ex) {
                continue;
            }
            try {
                let tx2 = await meta.vote(2, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i], value: MOCK_VOTER_VOTES[i] });
            } catch (ex) {
                continue;
            }
            transactionSuccess = true;
        }
        assert(!transactionSuccess, "No transactions should succeed")
    })
    it("should return locked funds after vote end", async () => {
        let meta = await Debates.deployed();
        let voteContract = await VoteStation.deployed();
        let rewardFraction = CONTRACT_FRACTIONS.DEBATE_MAJORITY_VOTER_REWARD_NUMERATOR / CONTRACT_FRACTIONS.DEBATE_MAJORITY_VOTER_REWARD_DENOMINATOR;
        //await meta.settleCreatorAmounts(1);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let tx = await meta.returnVoteFundsAndReward(1, { from: MOCK_VOTERS[i] });
            let finalBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let details = await voteContract.getVoterDetail.call(1, MOCK_VOTERS[i]);
            const { majorityAccepted, forTotal, againstTotal } = details;
            let majorityReward = 0;
            if (majorityAccepted && MOCK_VOTERS_FOR[i]) {
                majorityReward = MOCK_DEBATE_CREATOR_1_STAKE * rewardFraction * MOCK_VOTER_VOTES[i] / forTotal;
            } else if (!majorityAccepted && !MOCK_VOTERS_FOR[i]) {
                majorityReward = MOCK_DEBATE_CREATOR_1_STAKE * rewardFraction * MOCK_VOTER_VOTES[i] / againstTotal;
            }
            let gasCost = await getGasCost(tx);
            assert.equal(initialBalance.add(new BN(MOCK_VOTER_VOTES[i])).add(new BN(majorityReward)).sub(new BN(gasCost)).toString(), finalBalance.toString(), "should have transfered locked amounts correctly");
        }
        //test independently
        //await meta.settleCreatorAmounts(2);
        let votesAgainsSecondDebate = 10 * Math.pow(10, 6);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let tx = await meta.returnVoteFundsAndReward(2, { from: MOCK_VOTERS[i] });
            let finalBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let details = await voteContract.getVoterDetail.call(2, MOCK_VOTERS[i]);
            const { againstTotal } = details;
            //this debate all rejected and all staked same amount
            assert.equal(new BN(votesAgainsSecondDebate * 4).toString(), againstTotal.toString(), "should equal")
            majorityReward = MOCK_DEBATE_CREATOR_2_STAKE * rewardFraction * votesAgainsSecondDebate / againstTotal;
            let gasCost = await getGasCost(tx);
            assert.equal(initialBalance.add(new BN(votesAgainsSecondDebate)).add(new BN(majorityReward)).sub(new BN(gasCost)).toString(), finalBalance.toString(), "should have transfered locked amounts correctly");
        }
    })
    it("should have correct debate details after vote period", async () => {
        let meta = await Debates.deployed();
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getDebateDetails.call(1, { from: MOCK_VOTERS[i] });
            const { ipfsHash, stake, creator, voterLockedAmount, tag1, tag2, tag3 } = details;
            assert.equal(ipfsHash, "0x123", "ipfs hashes dont match");
            assert.equal(stake, MOCK_DEBATE_CREATOR_1_STAKE, "wrong stake amount");
            assert.equal(creator, MOCK_DEBATE_CREATOR_1, "wrong debate creator");
            assert.equal(voterLockedAmount, MOCK_VOTER_VOTES[i], "wrong locked amount");
            assert.equal(tag1, MOCK_TAGS[0], "tag didnt match expected");
            assert.equal(tag2, MOCK_TAGS[1], "tag didnt match expected");
            assert.equal(tag3, MOCK_TAGS[2], "tag didnt match expected");
        }
        let votesAgains = 10 * Math.pow(10, 6);
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getDebateDetails.call(2, { from: MOCK_VOTERS[i] });
            const { ipfsHash, stake, creator, voterLockedAmount, tag1, tag2, tag3 } = details;
            assert.equal(ipfsHash, "0x456", "ipfs hashes dont match");
            assert.equal(stake, MOCK_DEBATE_CREATOR_1_STAKE, "wrong stake amount");
            assert.equal(creator, MOCK_DEBATE_CREATOR_1, "wrong debate creator");
            assert.equal(voterLockedAmount, votesAgains, "wrong locked amount");
            assert.equal(tag1, MOCK_TAGS[0], "tag didnt match expected");
            assert.equal(tag2, MOCK_TAGS[1], "tag didnt match expected");
            assert.equal(tag3, MOCK_TAGS[2], "tag didnt match expected");
        }

        let voteContract = await VoteStation.deployed();
        const now = Date.now() / 1000;

        let debate1Details = await voteContract.getVoteDetail(1);

        assert(debate1Details.endTime < now, "end time should be in the past");
        assert.equal(debate1Details.ongoing, false, "should not be ongoing");
        assert.equal(debate1Details.majorityAccepted, true, "wrong vote result");
        assert.equal(debate1Details.forTotal, MOCK_VOTER_1_VOTES + MOCK_VOTER_3_VOTES, "for counts didnt match");
        assert.equal(debate1Details.againstTotal, MOCK_VOTER_2_VOTES + MOCK_VOTER_4_VOTES, "against counts didnt match");

        let debate2Details = await voteContract.getVoteDetail(2);
        assert(debate2Details.endTime < now, "end time should be in the past");
        assert.equal(debate2Details.ongoing, false, "should not be ongoing");
        assert.equal(debate2Details.majorityAccepted, false, "wrong vote result");
        assert.equal(debate2Details.forTotal, 0, "for counts didnt match");
        assert.equal(debate2Details.againstTotal, votesAgains * 4, "against counts didnt match");
    })
    it("should not return locked funds if already returned", async () => {
        let meta = await Debates.deployed();
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let tx = await meta.returnVoteFundsAndReward(1, { from: MOCK_VOTERS[i] });
            let finalBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let gasCost = await getGasCost(tx);
            assert.equal(initialBalance.sub(new BN(gasCost)).toString(), finalBalance.toString(), "should have not transfered any amounts");
        }
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let tx = await meta.returnVoteFundsAndReward(2, { from: MOCK_VOTERS[i] });
            let finalBalance = new BN(await web3.eth.getBalance(MOCK_VOTERS[i]));
            let gasCost = await getGasCost(tx);
            assert.equal(initialBalance.sub(new BN(gasCost)).toString(), finalBalance.toString(), "should have not transfered any amounts");
        }
    })
    it("should have correct opinions contract", async () => {
        let meta = await Debates.deployed();
        let opinions = await Opinions.deployed();
        let settings = await Settings.deployed();
        let initialOpinionsAdr = await opinions.address;
        let initialRefAdr = await settings.getAddressValue(KEY_ADDRESS_OPINIONS);
        assert.equal(initialOpinionsAdr, initialRefAdr, "addresses should equal")
        await await settings.setAddressValue(KEY_ADDRESS_OPINIONS, MOCK_OPINION_CONTRACT);
        let newRefAdr = await settings.getAddressValue(KEY_ADDRESS_OPINIONS);
        assert.equal(MOCK_OPINION_CONTRACT, newRefAdr, "new addresses should equal")
    })
    it("should be able to look up all accepted and rejected debates", async () => {
        let meta = await Debates.deployed();
        let acceptedDebateData = await meta.getAcceptedDebateIds(0, 10);
        assert.equal(acceptedDebateData.values[0].toString(), "1", "Invalid accepted debate id");
        let rejectedDebateData = await meta.getRejectedDebateIds(0, 10);
        assert.equal(rejectedDebateData.values[0].toString(), "2", "Invalid rejected debate id");
        let pendingDebateData = await meta.getPendingDebateIds(0, 10);
        assert(pendingDebateData.values.length === 0, "Should not have pending ids");
    })
    it("should be able to find debate by tag", async () => {
        let meta = await Tags.deployed();
        let idsResponse = await meta.getIdsForTag(MOCK_TAGS[0], 0, 10);
        assert.equal(idsResponse.values[0], "1", "Debate id did not match expected")
        assert.equal(idsResponse.values[1], "2", "Debate id did not match expected")
    })
})