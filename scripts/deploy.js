const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 获取部署者账户（管理员账户）
  const [deployer] = await hre.ethers.getSigners();
  console.log("使用账户地址部署:", await deployer.getAddress());

  // 确认这是否是预期的管理员地址
  const adminAddress = "0x20883041bc83dcfc98108712d1e96f4d9f13e3bc";
  if ((await deployer.getAddress()).toLowerCase() !== adminAddress.toLowerCase()) {
    throw new Error("部署账户与预期的管理员地址不匹配！");
  }

  console.log("\n开始部署合约...");
  
  // 1. 部署工厂合约
  console.log("\n1. 部署 CrowdFundingFactory 合约...");
  const Factory = await hre.ethers.getContractFactory("CrowdFundingFactory");
  const factory = await Factory.deploy(adminAddress);
  await factory.waitForDeployment();
  console.log("CrowdFundingFactory 已部署到地址:", factory.target);

  // 2. 部署提案管理合约
  console.log("\n2. 部署 CrowdFundingProposalManager 合约...");
  const ProposalManager = await hre.ethers.getContractFactory("CrowdFundingProposalManager");
  const proposalManager = await ProposalManager.deploy(adminAddress, factory.target);
  await proposalManager.waitForDeployment();
  console.log("CrowdFundingProposalManager 已部署到地址:", proposalManager.target);

  // 3. 部署水龙头合约
  console.log("\n3. 部署 Faucet 合约...");
  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();
  await faucet.waitForDeployment();
  console.log("Faucet 已部署到地址:", faucet.target);

  // 向水龙头合约转入测试用的以太币
  const fundAmount = hre.ethers.parseEther("100.0");
  console.log(`\n向水龙头合约转入 ${hre.ethers.formatEther(fundAmount)} ETH...`);
  
  const tx = await deployer.sendTransaction({
    to: faucet.target,
    value: fundAmount
  });
  await tx.wait();
  
  // 配置水龙头参数
  await faucet.setLockTime(60); // 1分钟
  await faucet.setAmountAllowed(hre.ethers.parseEther("1.0")); // 1 ETH
  console.log("水龙头合约配置完成");

  // 保存所有合约地址
  const addresses = {
    admin: adminAddress,
    factory: factory.target,
    proposalManager: proposalManager.target,
    faucet: faucet.target,
    deployedAt: new Date().toISOString()
  };

  // 创建 deployments 目录（如果不存在）
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // 保存地址到文件
  fs.writeFileSync(
    path.join(deploymentsDir, 'addresses.json'),
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n部署完成！所有合约地址已保存到 deployments/addresses.json");
  console.log("\n合约地址概览：");
  console.log("管理员地址:", addresses.admin);
  console.log("工厂合约:", addresses.factory);
  console.log("提案管理合约:", addresses.proposalManager);
  console.log("水龙头合约:", addresses.faucet);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 