const path = require("path");
var HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = "ribbon dial betray jungle flower leave piano grocery miss globe credit annual";
module.exports = {
  contracts_build_directory: path.join(__dirname, "build/contracts"),
  networks: {
    development: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*" // Match any network id
    },
    sokol: {
      provider: function() {
        return new HDWalletProvider(MNEMONIC, "https://poa.api.nodesmith.io/v1/sokol/jsonrpc?apiKey=1c17f373e6d3483c97410c3ba26f4cfd")
      },
      network_id: 77,
      gas: 8000000  
    }
  },
  compilers: {
    solc: {
      version: "0.5.8 "
    }
 }
};

