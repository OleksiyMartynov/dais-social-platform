const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_DEBATES, KEY_ADDRESS_OPINIONS, CONTRACT_FRACTIONS, TOKEN_SYMBOL, TOKEN_NAME, TOKEN_RESERVE_RATIO, } = require("../constants");
const Government = artifacts.require("Government");
const FyiToken = artifacts.require("FyiToken");
const TokenVoteStation = artifacts.require("TokenVoteStation");
const BN = web3.utils.BN;

contract("Government", accounts => {
    let owner = accounts[0];
    const MOCK_PROPOSAL_CREATOR_1 = accounts[1];
    const MOCK_PROPOSAL_1_REWARD = 2 * Math.pow(10, 6);

    const MOCK_IMPL_CREATOR_1 = accounts[2];
    const MOCK_IMPL_1_STAKE = 1 * Math.pow(10, 5);

    const MOCK_IMPL_1_SPONSOR = accounts[3];
    const MOCK_IMPL_1_SPONSOR_AMOUNT = 2 * Math.pow(10, 6);

    const MOCK_PROPOSAL_CREATOR_2 = accounts[4];
    const MOCK_PROPOSAL_2_REWARD = 3 * Math.pow(10, 6);

    const MOCK_IMPL_CREATOR_2 = accounts[5];
    const MOCK_IMPL_2_STAKE = 1 * Math.pow(10, 5);

    const MOCK_VOTER_1 = accounts[6];
    const MOCK_VOTER_2 = accounts[7];
    const MOCK_VOTER_3 = accounts[8];
    const MOCK_VOTER_4 = accounts[9];

    const MOCK_VOTERS = [MOCK_VOTER_1,
        MOCK_VOTER_2,
        MOCK_VOTER_3,
        MOCK_VOTER_4];
    const MOCK_VOTER_1_VOTES = 15 * Math.pow(10, 5);
    const MOCK_VOTER_2_VOTES = 20 * Math.pow(10, 5);
    const MOCK_VOTER_3_VOTES = 16 * Math.pow(10, 5);
    const MOCK_VOTER_4_VOTES = 5 * Math.pow(10, 5);
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

    let govInstance;
    let fyiTokenInstance;
    let tokenVoteStationInstance;

    before(async () => {
        govInstance = await Government.deployed();
        fyiTokenInstance = await FyiToken.deployed();
        tokenVoteStationInstance = await TokenVoteStation.deployed();
        expect(govInstance.address).to.exist;
        const amount = 10 * Math.pow(10, 18);
        for (let i = 0; i < 10; i++) {
            await fyiTokenInstance.mint({ value: amount, from: accounts[i] });
            const bal = await fyiTokenInstance.balanceOf(accounts[i]);
            //console.log((bal/Math.pow(10,18)).toString());
        }

    })
    it("should not be able to add proposal without stake", async () => {
        let error = false;
        try {
            await govInstance.createProposal("0x0", 1);
        } catch (ex) {
            error = true;
        }
        assert(error, "should throw exception");
        error = false;
        try {
            await govInstance.createProposal("0x0", 0, { value: 1 });
        } catch (ex) {
            error = true;
        }
        assert(error, "should throw exception");
    });
    it("should be able to add proposal", async () => {
        await fyiTokenInstance.approve(await govInstance.address, MOCK_PROPOSAL_1_REWARD, { from: MOCK_PROPOSAL_CREATOR_1 })
        let tx = await govInstance.createProposal("0x0", MOCK_PROPOSAL_1_REWARD, { from: MOCK_PROPOSAL_CREATOR_1 });
        assert(tx.receipt.status, "transaction 1 failed");
        let proposalIds = await govInstance.getProposalIds(0, 10);
        assert.equal(proposalIds[0].toString(), "1", "did not get expected id");
    });
    it("should return correct proposal details", async () => {
        let details = await govInstance.getProposalDetails(1);
        const { ipfsHash, stake, creator, paidRewardOrPunishment, pendingId } = details;
        assert.equal(ipfsHash, "0x0", "ipfs hash did not match expected");
        assert.equal(stake.toString(), MOCK_PROPOSAL_1_REWARD.toString(), "reward did not match expected");
        assert.equal(creator, MOCK_PROPOSAL_CREATOR_1, "creator address did not match expected");
        assert.equal(paidRewardOrPunishment, false, "flag did not match expected");
        assert.equal(pendingId.toString(), "0", "pending id did not match expected");

    });

    it("should be able to add more reward to proposal", async () => {
        const extraReward = MOCK_IMPL_1_SPONSOR_AMOUNT * 2;
        const initialSponsorBal = await fyiTokenInstance.balanceOf(MOCK_IMPL_1_SPONSOR);
        await fyiTokenInstance.approve(await govInstance.address, extraReward, { from: MOCK_IMPL_1_SPONSOR });
        await govInstance.addToProposal(1, extraReward, { from: MOCK_IMPL_1_SPONSOR });
        const finalSponsorBal = await fyiTokenInstance.balanceOf(MOCK_IMPL_1_SPONSOR);
        assert.equal(initialSponsorBal.sub(new BN(extraReward)).toString(), finalSponsorBal.toString(), "Token balance did not match expected");
    })
    it("should not be able to withdraw reward from proposal if greater than initial amount deposited", async () => {
        let failed = false;
        try {
            const extraReward = MOCK_IMPL_1_SPONSOR_AMOUNT * 3;
            const initialSponsorBal = await fyiTokenInstance.balanceOf(MOCK_IMPL_1_SPONSOR);
            await govInstance.withdrawFromProposal(1, extraReward, { from: MOCK_IMPL_1_SPONSOR });
            const finalSponsorBal = await fyiTokenInstance.balanceOf(MOCK_IMPL_1_SPONSOR);
            assert.equal(initialSponsorBal.toString(), finalSponsorBal.toString(), "Token balance did not match expected");
        } catch (ex) {
            failed = true;
        }
        assert(failed, 'Transaction should fail');
    })
    it("should be able to withdraw reward from proposal", async () => {
        const extraReward = MOCK_IMPL_1_SPONSOR_AMOUNT;
        const initialSponsorBal = await fyiTokenInstance.balanceOf(MOCK_IMPL_1_SPONSOR);
        await govInstance.withdrawFromProposal(1, extraReward, { from: MOCK_IMPL_1_SPONSOR });
        const finalSponsorBal = await fyiTokenInstance.balanceOf(MOCK_IMPL_1_SPONSOR);
        assert.equal(initialSponsorBal.add(new BN(extraReward)).toString(), finalSponsorBal.toString(), "Token balance did not match expected");
    })
    it("should not be able to create implementation without stake", async () => {
        let error = false;
        try {
            await govInstance.createImplementation("0x1", 1, 0, { from: MOCK_IMPL_CREATOR_1 });
        } catch (ex) {
            error = true;
        }
        assert(error, "should throw exception");
        error = false;
        try {
            await govInstance.createImplementation("0x1", 1, MOCK_IMPL_1_STAKE, { from: MOCK_IMPL_CREATOR_1 });
        } catch (ex) {
            error = true;
        }
        assert(error, "should throw exception");
    });
    it("should be able to create implementation", async () => {
        await fyiTokenInstance.approve(await govInstance.address, MOCK_IMPL_1_STAKE, { from: MOCK_IMPL_CREATOR_1 });
        await govInstance.createImplementation("0x1", 1, MOCK_IMPL_1_STAKE, { from: MOCK_IMPL_CREATOR_1 });
        let details = await govInstance.getProposalDetails(1);
        const { pendingId } = details;

        assert.equal(pendingId.toString(), "1", "pending id did not match expected");
        let implDetails = await govInstance.getImplementationDetails(1);
        const { ipfsHash, stake, creator, paidBackStake } = implDetails;
        assert.equal(ipfsHash, "0x1", "ipfs hashes did not match");
        assert.equal(stake, MOCK_IMPL_1_STAKE, "stakes did not match");
        assert.equal(creator, MOCK_IMPL_CREATOR_1, "creators did not match");
        assert.equal(paidBackStake, false, "should be false at this stage");
    });
    it("should not be able to vote on invalid impl id", async () => {
        await fyiTokenInstance.approve(await govInstance.address, MOCK_VOTER_1_VOTES, { from: MOCK_VOTER_1 });
        let error = false;
        try {
            await govInstance.vote(0, MOCK_VOTER_1_FOR, MOCK_VOTER_1_VOTES, { from: MOCK_VOTER_1 });
        } catch (ex) {
            error = true;
        }
        assert(error, "should have thrown")
        error = false;
        try {
            await govInstance.vote(0, MOCK_VOTER_1_FOR, MOCK_VOTER_1_VOTES, { from: MOCK_VOTER_1 });
        } catch (ex) {
            error = true;
        }
    });
    it("should not be able to vote without stake", async () => {
        await fyiTokenInstance.approve(await govInstance.address, 0, { from: MOCK_VOTER_1 });
        let error = false;
        try {
            await govInstance.vote(1, MOCK_VOTER_1_FOR, MOCK_VOTER_1_VOTES, { from: MOCK_VOTER_1 });
        } catch (ex) {
            error = true;
        }
        assert(error, "should have thrown")
        error = false;
        try {
            await govInstance.vote(1, MOCK_VOTER_1_FOR, MOCK_VOTER_1_VOTES, { from: MOCK_VOTER_1 });
        } catch (ex) {
            error = true;
        }
    });
    it("should be able to vote before end time", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            await fyiTokenInstance.approve(await tokenVoteStationInstance.address, MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            let tx = await govInstance.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
    });
    it("should not return locked funds before impl vote end", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let failed = false;
            try {
                let tx = await govInstance.returnVoteFundsAndReward(1, { from: MOCK_VOTERS[i] });
            } catch (ex) {
                failed = true;
            }
            assert(failed, "transaction should fail");
        }
    });
    it("should not be able to vote after vote time", async () => {
        console.log("\x1b[2m", "   ⏳ waiting for vote period end ")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let failed = false;
            try {
                await fyiTokenInstance.approve(await tokenVoteStationInstance.address, MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
                let tx = await govInstance.vote(1, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            } catch (ex) {
                failed = true;
            }
            await fyiTokenInstance.approve(await tokenVoteStationInstance.address, 0, { from: MOCK_VOTERS[i] });
            assert(failed, "transaction should fail");
        }
    });
    it("should return locked funds after vote end", async () => {
        const creatorReward = MOCK_PROPOSAL_1_REWARD + MOCK_IMPL_1_STAKE + MOCK_IMPL_1_SPONSOR_AMOUNT;
        const initialCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_1);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let tx = await govInstance.returnVoteFundsAndReward(1, { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
        let implDetails = await govInstance.getImplementationDetails(1);
        const { ipfsHash, stake, creator, paidBackStake } = implDetails;
        assert.equal(ipfsHash, "0x1", "ipfs hashes did not match");
        assert.equal(stake, MOCK_IMPL_1_STAKE, "stakes did not match");
        assert.equal(creator, MOCK_IMPL_CREATOR_1, "creators did not match");
        assert.equal(paidBackStake, true, "should be false at this stage");
        const finalCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_1);
        assert.equal(initialCreatorBalance.add(new BN(creatorReward)).toString(), finalCreatorBalance.toString());
    });
    it("should not return locked funds if already returned", async () => {
        const initialCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_1);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let tx = await govInstance.returnVoteFundsAndReward(1, { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
        const finalCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_1);
        assert.equal(initialCreatorBalance.toString(), finalCreatorBalance.toString());
    });
    it("should be able to look up all accepted impls", async () => {
        let acceptedImplData = await govInstance.getAcceptedImplementationIds(1, 0, 10);
        assert.equal(acceptedImplData.values[0].toString(), "1", "Invalid accepted impl id");
    });
    it("should be able to add another proposal", async () => {
        await fyiTokenInstance.approve(await govInstance.address, MOCK_PROPOSAL_2_REWARD, { from: MOCK_PROPOSAL_CREATOR_2 })
        let tx = await govInstance.createProposal("0x2", MOCK_PROPOSAL_2_REWARD, { from: MOCK_PROPOSAL_CREATOR_2 });
        assert(tx.receipt.status, "transaction 2 failed");
        let proposalIds = await govInstance.getProposalIds(0, 10);
        assert.equal(proposalIds[1].toString(), "2", "did not get expected id");
    })
    it("should be able to create implementation", async () => {
        await fyiTokenInstance.approve(await govInstance.address, MOCK_IMPL_2_STAKE, { from: MOCK_IMPL_CREATOR_2 });
        await govInstance.createImplementation("0x3", 2, MOCK_IMPL_2_STAKE, { from: MOCK_IMPL_CREATOR_2 });
        let details = await govInstance.getProposalDetails(2);
        const { pendingId } = details;

        assert.equal(pendingId.toString(), "2", "pending id did not match expected");
        let implDetails = await govInstance.getImplementationDetails(2);
        const { ipfsHash, stake, creator, paidBackStake } = implDetails;
        assert.equal(ipfsHash, "0x3", "ipfs hashes did not match");
        assert.equal(stake, MOCK_IMPL_2_STAKE, "stakes did not match");
        assert.equal(creator, MOCK_IMPL_CREATOR_2, "creators did not match");
        assert.equal(paidBackStake, false, "should be false at this stage");
    })
    it("should be able to vote before end time", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            await fyiTokenInstance.approve(await tokenVoteStationInstance.address, MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            let tx = await govInstance.vote(2, false, MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
    })
    it("should return locked funds after vote end", async () => {
        console.log("\x1b[2m", "   ⏳ waiting for vote period end ")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        const creatorReward = MOCK_PROPOSAL_2_REWARD + MOCK_IMPL_2_STAKE;
        const initialCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_2);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let tx = await govInstance.returnVoteFundsAndReward(2, { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
        let implDetails = await govInstance.getImplementationDetails(2);
        const { ipfsHash, stake, creator, paidBackStake } = implDetails;
        assert.equal(ipfsHash, "0x3", "ipfs hashes did not match");
        assert.equal(stake, "0", "stakes did not match");
        assert.equal(creator, MOCK_IMPL_CREATOR_2, "creators did not match");
        assert.equal(paidBackStake, true, "should be false at this stage");
        const finalCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_2);
        assert.equal(initialCreatorBalance.toString(), finalCreatorBalance.toString(), "Amount did not match expected");
    })
    it("should be able to look up rejected impls", async () => {
        let acceptedImplData = await govInstance.getRejectedImplementationIds(2, 0, 10);
        assert.equal(acceptedImplData.values[0].toString(), "2", "Invalid accepted impl id");
    })
    it("should be able to create implementation", async () => {
        await fyiTokenInstance.approve(await govInstance.address, MOCK_IMPL_2_STAKE, { from: MOCK_IMPL_CREATOR_2 });
        await govInstance.createImplementation("0x4", 2, MOCK_IMPL_2_STAKE, { from: MOCK_IMPL_CREATOR_2 });
        let details = await govInstance.getProposalDetails(2);
        const { pendingId } = details;

        assert.equal(pendingId.toString(), "3", "pending id did not match expected");
        let implDetails = await govInstance.getImplementationDetails(3);
        const { ipfsHash, stake, creator, paidBackStake } = implDetails;
        assert.equal(ipfsHash, "0x4", "ipfs hashes did not match");
        assert.equal(stake, MOCK_IMPL_2_STAKE, "stakes did not match");
        assert.equal(creator, MOCK_IMPL_CREATOR_2, "creators did not match");
        assert.equal(paidBackStake, false, "should be false at this stage");
    })
    it("should be able to vote before end time", async () => {
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            await fyiTokenInstance.approve(await tokenVoteStationInstance.address, MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            let tx = await govInstance.vote(2, MOCK_VOTERS_FOR[i], MOCK_VOTER_VOTES[i], { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
    })
    it("should return locked funds after vote end", async () => {
        console.log("\x1b[2m", "   ⏳ waiting for vote period end ")
        await waitFor(VOTE_DURATION * 1000 + 2000);
        const creatorReward = MOCK_PROPOSAL_2_REWARD + MOCK_IMPL_2_STAKE;
        const initialCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_2);
        for (let i = 0; i < MOCK_VOTERS.length; i++) {
            let tx = await govInstance.returnVoteFundsAndReward(3, { from: MOCK_VOTERS[i] });
            assert(tx.receipt.status, "transaction failed");
        }
        let implDetails = await govInstance.getImplementationDetails(3);
        const { ipfsHash, stake, creator, paidBackStake } = implDetails;
        assert.equal(ipfsHash, "0x4", "ipfs hashes did not match");
        assert.equal(stake, MOCK_IMPL_2_STAKE, "stakes did not match");
        assert.equal(creator, MOCK_IMPL_CREATOR_2, "creators did not match");
        assert.equal(paidBackStake, true, "should be false at this stage");
        const finalCreatorBalance = await fyiTokenInstance.balanceOf(MOCK_IMPL_CREATOR_2);
        assert.equal(initialCreatorBalance.add(new BN(creatorReward)).toString(), finalCreatorBalance.toString());
    })
})