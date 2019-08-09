const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION, KEY_ADDRESS_VOTING_DEBATES, KEY_ADDRESS_OPINIONS, CONTRACT_FRACTIONS, TOKEN_SYMBOL, TOKEN_NAME, TOKEN_RESERVE_RATIO, } = require("../constants");
const FyiToken = artifacts.require("FyiToken");
const BN = web3.utils.BN;

contract("FyiToken", accounts => {
    let owner = accounts[0];
    let fyiTokenInstance;

    before(async () => {
        fyiTokenInstance = await FyiToken.deployed();
        expect(fyiTokenInstance.address).to.exist
    })
    it("should have correct vote station address", async () => {

        const tokenName = await fyiTokenInstance.name.call();
        const tokenSymbol = await fyiTokenInstance.symbol.call();
        const tokenRR = await fyiTokenInstance.reserveRatio.call();
        const ownerOf = await fyiTokenInstance.owner();
        const totalSupply = await fyiTokenInstance.totalSupply();
        assert.equal(tokenName, TOKEN_NAME, "Token was not deployed with correct parameters");
        assert.equal(tokenSymbol, TOKEN_SYMBOL, "Token was not deployed with correct parameters");
        assert.equal(tokenRR, TOKEN_RESERVE_RATIO, "Token was not deployed with correct parameters");
        assert.equal(ownerOf, owner, 'Invalid contract owner');
        assert.equal(totalSupply.toString(), web3.utils.toWei('1', 'ether'), "Invalid initial supply");
    });
    it('calculates the same purchase and sale rate given the same inputs', async () => {

        const purchase = await fyiTokenInstance.calculatePurchaseReturn(
            web3.utils.toWei('2', 'ether'),
            web3.utils.toWei('0.5', 'ether'),
            TOKEN_RESERVE_RATIO,
            web3.utils.toWei('1', 'ether')
        );

        assert(purchase, "did not return expected value")

        const amt = new BN(web3.utils.toWei('2', 'ether')).add(purchase);

        const sale = await fyiTokenInstance.calculateSaleReturn(
            amt,
            web3.utils.toWei('1.5', 'ether'),
            TOKEN_RESERVE_RATIO,
            purchase
        );

        assert(sale, "did not return expected value")

        // returns 0.999999999999999999 (which is close enough to 1.0)
        assert.equal(web3.utils.fromWei(sale.toString()),'0.999999999999999999', 'prices should be equal');
    })
    it('Should allow to mint tokens by sending native coins', async () => {
        //todo
    })
  
    it('Should allow to burn tokens and recieve eth in return', async () => {
        //todo
    })
})