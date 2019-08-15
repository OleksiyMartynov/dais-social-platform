const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_DEBATES, KEY_ADDRESS_OPINIONS, CONTRACT_FRACTIONS, TOKEN_SYMBOL, TOKEN_NAME, TOKEN_RESERVE_RATIO, } = require("../constants");
const Government = artifacts.require("Government");
const BN = web3.utils.BN;

contract("Government", accounts => {
    let owner = accounts[0];
    let govInstance;

    before(async () => {
        govInstance = await Government.deployed();
        expect(govInstance.address).to.exist;
    })
    it("should not be able to add proposal without stake", async () => {

    });
    it("should be able to add proposal", async () => {

    });
    it("should return correct proposal details", async () => {

    });
    it("should not be able to create implementation without stake", async () => {

    });
    it("should be able to create implementation", async () => {

    });
    it("should not be able to vote on invalid impl id", async () => {

    });
    it("should not be able to vote without stake", async () => {

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