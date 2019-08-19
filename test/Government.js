const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_DEBATES, KEY_ADDRESS_OPINIONS, CONTRACT_FRACTIONS, TOKEN_SYMBOL, TOKEN_NAME, TOKEN_RESERVE_RATIO, } = require("../constants");
const Government = artifacts.require("Government");
const FyiToken = artifacts.require("FyiToken");
const BN = web3.utils.BN;

contract("Government", accounts => {
    let owner = accounts[0];
    const MOCK_PROPOSAL_CREATOR_1 = accounts[1];
    const MOCK_PROPOSAL_1_REWARD = 2 * Math.pow(10, 6);

    const MOCK_IMPL_CREATOR_1 = accounts[2];
    const MOCK_IMPL_1_STAKE = 1 * Math.pow(10, 5);;

    const MOCK_VOTER_1 = accounts[3];
    const MOCK_VOTER_2 = accounts[4];
    const MOCK_VOTER_3 = accounts[5];
    const MOCK_VOTER_4 = accounts[6];

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

    before(async () => {
        govInstance = await Government.deployed();
        fyiTokenInstance = await FyiToken.deployed();
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

    });
    it("should not return locked funds before impl vote end", async () => {

    });
    it("should have correct impl details during vote period", async () => {

    });
    it("should not be able to vote after vote time", async () => {

    });
    it("should return locked funds after vote end", async () => {

    });
    it("should have correct impl details after vote period", async () => {

    });
    it("should not return locked funds if already returned", async () => {

    });
    it("should be able to look up all accepted and rejected impls", async () => {

    });
})