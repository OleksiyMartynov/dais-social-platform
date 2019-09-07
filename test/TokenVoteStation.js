const { waitFor } = require("./Utils");

const { VOTE_DURATION } = require("../constants");
const TokenVoteStation = artifacts.require("TokenVoteStation");
const FyiToken = artifacts.require("FyiToken");
const BN = web3.utils.BN;


contract("TokenVoteStation", accounts => {
    const MOCK_CONTRACT_ADDRESS = accounts[0];
    const MOCK_UNAUTHARIZED_CONTRACT_ADDRESS = accounts[1];
    const MOCK_VOTER_1 = accounts[2];
    const MOCK_VOTER_2 = accounts[3];
    const MOCK_VOTER_3 = accounts[4];
    const MOCK_VOTER_4 = accounts[5];
    const MOCK_VOTERS = [MOCK_VOTER_1,
        MOCK_VOTER_2,
        MOCK_VOTER_3,
        MOCK_VOTER_4];

    const MOCK_VOTER_1_VOTES = 10 * Math.pow(10, 6);
    const MOCK_VOTER_2_VOTES = 20 * Math.pow(10, 6);
    const MOCK_VOTER_3_VOTES = 11 * Math.pow(10, 6);
    const MOCK_VOTER_4_VOTES = 22 * Math.pow(10, 6);
    const MOCK_VOTER_VOTES = [MOCK_VOTER_1_VOTES,
        MOCK_VOTER_2_VOTES,
        MOCK_VOTER_3_VOTES,
        MOCK_VOTER_4_VOTES];

    const MOCK_VOTER_1_FOR = true;
    const MOCK_VOTER_2_FOR = true;
    const MOCK_VOTER_3_FOR = false;
    const MOCK_VOTER_4_FOR = false;
    const MOCK_VOTERS_FOR = [MOCK_VOTER_1_FOR,
        MOCK_VOTER_2_FOR,
        MOCK_VOTER_3_FOR,
        MOCK_VOTER_4_FOR];

    let meta;
    let fyiTokenInstance;

    before(async () => {
        meta = await TokenVoteStation.deployed();
        const metaAddress = await meta.address;
        fyiTokenInstance = await FyiToken.deployed();
        expect(meta.address).to.exist;
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let amount = new BN(web3.utils.toWei('1', 'ether'));
            await fyiTokenInstance.mint({value:amount, from:MOCK_VOTERS[i]});
            await fyiTokenInstance.approve(metaAddress,amount, {from:MOCK_VOTERS[i]})
        }
    })
    it("should have correct deployment params", async () => {
        let duration = await meta.getVoteDuration.call();
        assert.equal(
            duration.valueOf(),
            VOTE_DURATION,
            "invalid deployment params"
        );
        let tokenContractAddress = await fyiTokenInstance.address;
        let tokenAddressFromContract = await meta.getTokenContractAddress.call();
        assert.equal(tokenContractAddress, tokenAddressFromContract, "Token contract addressed did not match");
    });
    it("should not allow start new vote", async () => {
        let failed = false;
        try {
            let tx = await meta.startVote();
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception");
    })
    it("should allow start new vote", async () => {
        let hasAccess = await meta.hasAccess(MOCK_CONTRACT_ADDRESS);
        assert(!hasAccess, "should not have access")
        await meta.grantAccess(MOCK_CONTRACT_ADDRESS);
        hasAccess = await meta.hasAccess(MOCK_CONTRACT_ADDRESS);
        assert(hasAccess, "should have access")
        let tx = await meta.startVote();
        assert(tx.receipt.status, "transaction failed")
        let count = await meta.getCount.call();
        assert.equal(count, 1, "id should be 1");
    })
    it("should not allow votes if unauthorized address", async () => {
        let failed = false;
        try {
            let tx1 = await meta.vote(1, MOCK_VOTER_1_FOR, MOCK_VOTER_1, MOCK_VOTER_1_VOTES, { from: MOCK_UNAUTHARIZED_CONTRACT_ADDRESS});
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception");

    })
    it("should allow votes before vote end time", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let voteContractAddress = await meta.address;
            let initialBalance = new BN(await fyiTokenInstance.balanceOf(voteContractAddress))
            await fyiTokenInstance.approve(voteContractAddress, MOCK_VOTER_VOTES[i]);
            let tx = await meta.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTERS[i], MOCK_VOTER_VOTES[i]);
            assert(tx.receipt.status, "transaction failed");
            let finalBalance = new BN(await fyiTokenInstance.balanceOf(voteContractAddress))
            let total = initialBalance.add(new BN(MOCK_VOTER_VOTES[i]));
            assert.equal(finalBalance.toString(),
                total.toString(),
                "Amount wasnt correctly deduced");
        }
    })
    it("should return correct general vote details during voting period", async () => {
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let details = await meta.getVoteDetail(1);
            const { startTime, endTime, ongoing, majorityAccepted, forTotal, againstTotal } = details;
            const now = Date.now() / 1000;
            assert(endTime > now, "end time should be in the future");
            assert.equal(ongoing, true, "should be ongoing");
            assert.equal(majorityAccepted, false, "always false untill endtime");
            assert.equal(forTotal, 0, "always false untill endtime");
            assert.equal(againstTotal, 0, "always false untill endtime");
        }
    })
    it("should return correct user voter details during voting period", async () => {
        for (let i = 0; i > MOCK_VOTERS.length; i++) {

            let details = await meta.getVoterDetail(1, MOCK_VOTERS[i]);
            const { startTime, endTime, ongoing, lockedAmount, votedFor, majorityAccepted, isInMajority, forTotal, againstTotal } = details;
            const now = Date.now() / 1000;
            assert(endTime > now, "end time should be in the future");
            assert.equal(ongoing, true, "should be ongoing");
            assert.equal(lockedAmount.toString(), MOCK_VOTER_VOTES[i]);
            assert.equal(votedFor, MOCK_VOTERS_FOR[i], "vote did not match");
            assert.equal(majorityAccepted, false, "always false untill endtime");
            assert.equal(isInMajority, false, "always false untill endtime");
            assert.equal(forTotal, 0, "always false untill endtime");
            assert.equal(againstTotal, 0, "always false untill endtime");
        }

    })
    it("should not allow votes if already voted", async () => {
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let failed = false;
            try {
                await fyiTokenInstance.approve(voteContractAddress, MOCK_VOTER_VOTES[i]);
                let tx1 = await meta.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTERS[i], MOCK_VOTER_VOTES[i]);
            } catch (ex) {
                failed = true;
            }
            assert(failed, "should have thrown an exception");
        }
    })
    it("should not return locked funds before vote end time", async () => {
        for (let i = 0; i > MOCK_VOTERS.length; i++) {
            let failed = false;
            try {
                let tx = await meta.returnFunds(1, MOCK_VOTERS[i]);
            } catch (ex) {
                failed = true;
            }
            assert(failed, "should have thrown an exception");
        }
    })
    it("should not allow votes after vote end time", async () => {
        console.log("\x1b[2m", "   ⏳ waiting for vote period end ")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            try {
                await fyiTokenInstance.approve(voteContractAddress, MOCK_VOTER_VOTES[i]);
                let tx = await meta.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTERS[i], MOCK_VOTER_VOTES[i]);
            } catch (ex) {
                continue;
            }
            assert.fail("transaction should have failed");
        }
    })
    it("should return correct general vote details after vote end time", async () => {
        const now = Date.now() / 1000;
        const votedForTotal = MOCK_VOTER_1_VOTES + MOCK_VOTER_2_VOTES;
        const votedAgainstTotal = MOCK_VOTER_3_VOTES + MOCK_VOTER_4_VOTES;

        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let details = await meta.getVoterDetail(1, MOCK_VOTERS[i]);
            const { startTime, endTime, ongoing, majorityAccepted, forTotal, againstTotal } = details;

            assert(endTime < now, "should be in the past");
            assert.equal(ongoing, false, "should be ongoing");
            assert.equal(majorityAccepted, votedForTotal > votedAgainstTotal, "should be :" + votedForTotal > votedAgainstTotal);
            assert.equal(forTotal, votedForTotal, "for counts didnt match");
            assert.equal(againstTotal, votedAgainstTotal, "against counts didnt match");
        }
    })
    it("should return correct user vote details after vote end time", async () => {
        const now = Date.now() / 1000;
        const votedForTotal = MOCK_VOTER_1_VOTES + MOCK_VOTER_2_VOTES;
        const votedAgainstTotal = MOCK_VOTER_3_VOTES + MOCK_VOTER_4_VOTES;

        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let details = await meta.getVoterDetail(1, MOCK_VOTERS[i]);
            const { startTime, endTime, ongoing, lockedAmount, votedFor, majorityAccepted, isInMajority, forTotal, againstTotal } = details;

            assert(endTime < now, "should be in the past");
            assert.equal(ongoing, false, "should be ongoing");
            assert.equal(lockedAmount, MOCK_VOTER_VOTES[i]);
            assert.equal(votedFor, MOCK_VOTERS_FOR[i], "vote did not match");
            assert.equal(majorityAccepted, votedForTotal > votedAgainstTotal, "should be :" + votedForTotal > votedAgainstTotal);
            assert.equal(isInMajority, votedForTotal > votedAgainstTotal && MOCK_VOTERS_FOR[i] || votedForTotal <= votedAgainstTotal && !MOCK_VOTERS_FOR[i], "should match is in minority/ is in majority for voter");
            assert.equal(forTotal, votedForTotal, "for counts didnt match");
            assert.equal(againstTotal, votedAgainstTotal, "against counts didnt match");
        }
    })
    it("should return locked funds after vote end time", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await fyiTokenInstance.balanceOf(MOCK_VOTERS[i]));
            let tx = await meta.returnFunds(1, MOCK_VOTERS[i]);
            let finalBalance = new BN(await fyiTokenInstance.balanceOf(MOCK_VOTERS[i]));
            assert.equal(initialBalance.add(new BN(MOCK_VOTER_VOTES[i])).toString(), finalBalance.toString(), "should have transfered locked token amounts");
        }
    })
    it("should not return locked funds if already returned", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let initialBalance = new BN(await fyiTokenInstance.balanceOf(MOCK_VOTERS[i]));
            let tx = await meta.returnFunds(1, MOCK_VOTERS[i]);
            let finalBalance = new BN(await fyiTokenInstance.balanceOf(MOCK_VOTERS[i]));
            assert.equal(initialBalance.toString(), finalBalance.toString(), "should have not transfered any amounts");
        }
    })
    it("should not be able to create new poll after denied access", async () => {
        await meta.denyAccess(MOCK_CONTRACT_ADDRESS);
        let failed = false;
        try {
            let tx = await meta.startVote();
        } catch (ex) {
            failed = true;
        }
        assert(failed, "should have thrown an exception");
    })

})