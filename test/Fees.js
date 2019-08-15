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
        let isExpectedOwner = await meta.isOwner({from:accounts[0]})
        assert(isExpectedOwner, "owner should be address[0]")
        let initialDevBalance = new BN(await web3.eth.getBalance(accounts[0]));
        console.log("\x1b[2m", "   ⏳ waiting for debate creation")
        await meta.create('0x123', ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });

        await meta.vote(1, false, 3, { from: MOCK_DEBATE_CREATOR_1, value: 3 });
        await waitFor(VOTE_DURATION * 1000 + 1000);
        await meta.settleCreatorAmounts(1, {from:MOCK_VOTER_1});
        let rejectedId = (await meta.getRejectedDebateIds(0,10)).values[0].toNumber();
        assert.equal(rejectedId,1);
        let finalDevBalance = new BN(await web3.eth.getBalance(accounts[0]));
        let devRewardFraction = CONTRACT_FRACTIONS.DEBATE_CREATOR_PUNISHMENT_NUMERATOR / CONTRACT_FRACTIONS.DEBATE_CREATOR_PUNISHMENT_DENOMINATOR;
        let devTotalReward = MOCK_DEBATE_CREATOR_1_STAKE * devRewardFraction;
        assert.equal(initialDevBalance.add(new BN(devTotalReward)).toString(),finalDevBalance.toString(), "Dev address did not receive correct reward")
    })

    it("should create debate", async () => {
        let meta = await Debates.deployed();
        console.log("\x1b[2m", "   ⏳ waiting for debate creation")
        await meta.create('0x123', ...MOCK_TAGS, { from: MOCK_DEBATE_CREATOR_1, value: MOCK_DEBATE_CREATOR_1_STAKE });
        await meta.vote(2, true, 3, { from: MOCK_DEBATE_CREATOR_1, value: 3 });
        await waitFor(VOTE_DURATION * 1000 + 1000);
        await meta.settleCreatorAmounts(2);
        DEBATE_ID = (await meta.getAcceptedDebateIds(0,10)).values[0].toNumber();
        assert.equal(DEBATE_ID,2);
    })

    it("should transfer correct dev fee to dev address, and correct reward fee to debate creator on opinion rejection", async () => {
        let meta = await Opinions.deployed();
        let debatesContractInstance = await Debates.deployed();
        let details = await debatesContractInstance.getDebateDetails.call(DEBATE_ID);
        const { creator } = details;
        await meta.create(DEBATE_ID, "0x789", { from: MOCK_OPINION_CREATOR_1, value: MOCK_OPINION_CREATOR_1_STAKE });
        let voteAmount = 5 * Math.pow(10,6);
        let OPINION_ID = 3;
        await meta.vote(OPINION_ID, false, voteAmount, { from: MOCK_VOTER_1, value: voteAmount });
        console.log("\x1b[2m", "   ⏳ waiting for opinion rejection vote")
        await waitFor(VOTE_DURATION * 1000 + 1000);
        let debateCreatorRewardFraction = CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_NUMERATOR / CONTRACT_FRACTIONS.OPINION_CREATOR_REWARD_DENOMINATOR; // reward if first opinion proposed is rejected
        let initialDebateCreatorBalance = new BN(await web3.eth.getBalance(creator));
        tx = await meta.returnVoteFundsAndReward(OPINION_ID, { from: MOCK_VOTER_1});
        let finalDebateCreatorBalance = new BN(await web3.eth.getBalance(creator));
        let debateCreatorReward = MOCK_OPINION_CREATOR_1_STAKE * debateCreatorRewardFraction;
        assert.equal(initialDebateCreatorBalance.add(new BN(debateCreatorReward)).toString(), finalDebateCreatorBalance.toString(), "Debate creator did not get correct reward");
    })

})