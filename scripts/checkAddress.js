const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("从 hardhat.config.js 配置的私钥派生出的地址是:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 