const constants = require("../constants");

var VoteStation = artifacts.require("./VoteStation.sol");
var Debates = artifacts.require("./Debates.sol");
var Opinions = artifacts.require("./Opinions.sol");
var Tags = artifacts.require("./Tags.sol");
var Settings = artifacts.require("./Settings.sol");
var FyiToken = artifacts.require("./FyiToken.sol");
var TokenVoteStation = artifacts.require("./TokenVoteStation.sol")
var Government = artifacts.require("./Government.sol");

module.exports = async function(deployer) {
  let voteStationInst, debatesInst, opinionsInst, tagsInst, settingsInst, fyiTokenInst, tokenVoteStationInst, governmentInst;

  await deployer.deploy(VoteStation, constants.VOTE_DURATION);
  await deployer.deploy(Settings);
  await deployer.deploy(FyiToken, constants.TOKEN_NAME, constants.TOKEN_SYMBOL, constants.TOKEN_RESERVE_RATIO);

  voteStationInst = await VoteStation.deployed();
  settingsInst = await Settings.deployed();
  fyiTokenInst = await FyiToken.deployed();

  await Promise.all([
    deployer.deploy(Debates, settingsInst.address),
    deployer.deploy(Opinions, settingsInst.address),
    deployer.deploy(Tags, settingsInst.address),
    deployer.deploy(TokenVoteStation, constants.VOTE_DURATION, fyiTokenInst.address),
    //deployer.deploy(Government, settingsInst.address),
  ]);

  instances = await Promise.all([
    Debates.deployed(),
    Opinions.deployed(),
    Tags.deployed(),
    TokenVoteStation.deployed(),
    //Government.deployed(),
  ])

  debatesInst = instances[0];
  opinionsInst = instances[1];
  tagsInst = instances[2];
  tokenVoteStationInst = instances[3];
  //governmentInst = instances[4];

  //settings contract init
  settingsInst.setAddressValue(constants.KEY_ADDRESS_TOKEN, fyiTokenInst.address);
  settingsInst.setAddressValue(constants.KEY_ADDRESS_TAGS, tagsInst.address);
  settingsInst.setAddressValue(constants.KEY_ADDRESS_VOTING_OPINIONS, voteStationInst.address);
  settingsInst.setAddressValue(constants.KEY_ADDRESS_VOTING_DEBATES, voteStationInst.address);
  settingsInst.setAddressValue(constants.KEY_ADDRESS_DEBATES, debatesInst.address);
  settingsInst.setAddressValue(constants.KEY_ADDRESS_OPINIONS, opinionsInst.address);
  //settingsInst.setAddressValue(constants.KEY_ADDRESS_VOTING_GOVERNMENT, tokenVoteStationInst.address);
  settingsInst.setIntValue("MIN_TAG_LENGTH",constants.MIN_TAG_LENGTH);
  settingsInst.setIntValue("MAX_TAG_LENGTH",constants.MAX_TAG_LENGTH);

  Object.keys(constants.CONTRACT_FRACTIONS).forEach(key=>{
    settingsInst.setIntValue(key, constants.CONTRACT_FRACTIONS[key]);
  })

  results = await Promise.all([
    voteStationInst.grantAccess(debatesInst.address),
    voteStationInst.grantAccess(opinionsInst.address),
    //tokenVoteStationInst.grantAccess(governmentInst.address),
  ]);

};