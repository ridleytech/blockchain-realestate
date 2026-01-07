const PropertyNFT = artifacts.require("PropertyNFT");
const FractionalToken = artifacts.require("FractionalToken");
const FractionalTokenFactory = artifacts.require("FractionalTokenFactory");

module.exports = async function (deployer, network, accounts) {
  const [deployerAccount] = accounts;

  // Deploy PropertyNFT contract
  await deployer.deploy(PropertyNFT);
  const propertyNFT = await PropertyNFT.deployed();
  console.log("PropertyNFT deployed at:", propertyNFT.address);

  await deployer.deploy(FractionalToken);
  const fractionalToken = await FractionalToken.deployed();
  console.log("FractionalToken deployed at:", fractionalToken.address);

  // Deploy FractionalTokenFactory contract
  await deployer.deploy(FractionalTokenFactory);
  const factory = await FractionalTokenFactory.deployed();
  console.log("FractionalTokenFactory deployed at:", factory.address);

  // Example: Mint a test property NFT
  try {
    const tx = await propertyNFT.mintProperty(
      deployerAccount,
      "Test Property",
      "123 Main St",
      2000, // size in sq ft
      "ipfs://test-uri"
    );
    console.log("Test property minted. Tx hash:", tx.tx);
  } catch (error) {
    console.error("Error minting test property:", error);
  }
};
