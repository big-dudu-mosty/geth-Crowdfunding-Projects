const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Replace with your actual admin address
  const adminAddress = "0x20883041bc83dcfc98108712d1e96f4d9f13e3bc";

  const CrowdFundingFactory = await ethers.getContractFactory("CrowdFundingFactory");
  const factory = await CrowdFundingFactory.deploy(adminAddress);

  // Wait for the contract to be deployed
  await factory.waitForDeployment();

  const factoryAddress = factory.target;

  console.log("CrowdFundingFactory deployed to:", factoryAddress);

  // Save the deployed address to a file
  const addressesPath = path.join(__dirname, "..", "deployedAddresses.json");
  const addresses = fs.existsSync(addressesPath) ? JSON.parse(fs.readFileSync(addressesPath, "utf8")) : {};
  
  // Store by network name
  const network = hardhatArguments.network || "default";
  addresses[network] = {
    CrowdFundingFactory: factoryAddress
  };

  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log("Deployed factory address saved to", addressesPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 