const { waitFor, getGasCost } = require("./Utils");

const { VOTE_DURATION } = require("../constants");
const VoteStation = artifacts.require("VoteStation");
const Debates = artifacts.require("Debates");
const Opinions = artifacts.require("Opinions");
const Settings = artifacts.require("Settings");
const BN = web3.utils.BN;

contract("Settings", accounts => {
    it("should set and get settings correctly", async () => {
        let meta = await Settings.deployed();
        await meta.setIntValue("KEY_INT", 3);
        let num = await meta.getIntValue("KEY_INT");
        assert.equal(num.toNumber(), 3, "Number value did not match expected");

        await meta.setAddressValue("KEY_ADDRESS", accounts[1]);
        let address = await meta.getAddressValue("KEY_ADDRESS");
        assert.equal(address, accounts[1].toString(), "Address value did not match expected");

        await meta.setStringValue("KEY_STRING", "Hello, world!");
        let str = await meta.getStringValue("KEY_STRING");
        assert.equal(str, "Hello, world!", "String value did not match expected");

        await meta.setBoolValue("KEY_BOOL", true);
        let flag = await meta.getBoolValue("KEY_BOOL");
        assert.equal(flag, true, "Boolean value did not match expected");

        await meta.setBytesValue("KEY_BYTES", "0x333333");
        let bytes = await meta.getBytesValue("KEY_BYTES");
        assert.equal(bytes, "0x333333", "Bytes value did not match expected");
    });
});