const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_OPINIONS, KEY_ADDRESS_DEBATES, CONTRACT_FRACTIONS } = require("../constants");
const VoteStation = artifacts.require("VoteStation");
const Opinions = artifacts.require("Opinions");
const Debates = artifacts.require("Debates");
const Settings = artifacts.require("Settings");
const BN = web3.utils.BN;

contract("Debates,Opinion", accounts => {
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
    

    it("should transfer correct dev fee to dev address on debate rejection", async () => {
        let meta = await Debates.deployed();
        console.log("\x1b[2m", "   ⏳ waiting for debate creation")
        await meta.create('0x123', ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });

        await meta.vote(1, false, { from: MOCK_DEBATE_CREATOR_1, value: 3 });
        await waitFor(VOTE_DURATION * 1000 + 1000);
        await meta.settleCreatorAmounts(1);
        let rejectedId = (await meta.getRejectedDebateIds(0,10)).values[0].toNumber();
        assert.equal(rejectedId,1);
        //todo check amount transfered to contract owner on debate rejection
    })

    it("should create debate", async () => {
        let meta = await Debates.deployed();
        console.log("\x1b[2m", "   ⏳ waiting for debate creation")
        await meta.create('0x123', ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });

        await meta.vote(2, true, { from: MOCK_DEBATE_CREATOR_1, value: 3 });
        await waitFor(VOTE_DURATION * 1000 + 1000);
        await meta.settleCreatorAmounts(2);
        DEBATE_ID = (await meta.getAcceptedDebateIds(0,10)).values[0].toNumber();
        assert.equal(DEBATE_ID,2);
    })

    it("should transfer correct dev fee to dev address on opinion rejection", async () => {
        //todo check amount transfered to contract owner on opinion rejection
    })

    it("should transfer correct reward fee to debate creator address on opinion rejection", async () => {
        //todo check amount transfered to debate creator address on opinion rejection
    })

    it("should transfer correct reward fee to debate creator address on opinion accepted", async () => {
        //todo check amount transfered to debate creator address on opinion accepted
    })

})