const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PropertyNFT
  const PropertyNFT = await hre.ethers.getContractFactory("PropertyNFT");
  const propertyNFT = await PropertyNFT.deploy();
  await propertyNFT.waitForDeployment();
  console.log("PropertyNFT deployed to:", await propertyNFT.getAddress());

  // Deploy FractionalTokenFactory
  const FractionalTokenFactory = await hre.ethers.getContractFactory(
    "FractionalTokenFactory"
  );
  const factory = await FractionalTokenFactory.deploy();
  await factory.waitForDeployment();
  console.log(
    "FractionalTokenFactory deployed to:",
    await factory.getAddress()
  );

  // Save the addresses to a file for frontend
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify(
      {
        PropertyNFT: await propertyNFT.getAddress(),
        FractionalTokenFactory: await factory.getAddress(),
      },
      undefined,
      2
    )
  );

  // Save the contract ABI
  const PropertyNFTArtifact = await hre.artifacts.readArtifact("PropertyNFT");
  const FactoryArtifact = await hre.artifacts.readArtifact(
    "FractionalTokenFactory"
  );
  const FractionalTokenArtifact = await hre.artifacts.readArtifact(
    "FractionalToken"
  );

  fs.writeFileSync(
    contractsDir + "/PropertyNFT.json",
    JSON.stringify(PropertyNFTArtifact, null, 2)
  );

  fs.writeFileSync(
    contractsDir + "/FractionalTokenFactory.json",
    JSON.stringify(FactoryArtifact, null, 2)
  );

  fs.writeFileSync(
    contractsDir + "/FractionalToken.json",
    JSON.stringify(FractionalTokenArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
