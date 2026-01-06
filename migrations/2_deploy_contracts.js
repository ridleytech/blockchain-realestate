const PropertyNFT = artifacts.require("PropertyNFT");
const FractionalToken = artifacts.require("FractionalToken");
const FractionalTokenFactory = artifacts.require("FractionalTokenFactory");

module.exports = function(deployer) {
  deployer.deploy(PropertyNFT);
  deployer.deploy(FractionalToken);
  deployer.deploy(FractionalTokenFactory);
};
