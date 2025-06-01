const hre = require("hardhat");

async function main() {
  // 获取部署者账户（应该是 Geth 上的管理员账户）
  const [deployer] = await hre.ethers.getSigners();
  console.log("使用账户地址部署:", await deployer.getAddress());
  
  // 确认这是否是预期的管理员地址
  const adminAddress = "0x20883041bc83dcfc98108712d1e96f4d9f13e3bc";
  if ((await deployer.getAddress()).toLowerCase() !== adminAddress.toLowerCase()) {
    throw new Error("部署账户与预期的管理员地址不匹配！");
  }

  console.log("开始部署水龙头合约...");

  // 部署 Faucet 合约
  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();
  await faucet.waitForDeployment();

  console.log("水龙头合约已部署到地址:", faucet.target);

  // 向水龙头合约转入一些测试用的以太币
  const fundAmount = hre.ethers.parseEther("100.0"); // 转入 10 ETH
  
  // 检查部署者账户余额
  const balance = await deployer.provider.getBalance(deployer.getAddress());
  console.log("部署者当前余额:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < fundAmount) {
    throw new Error("部署者账户余额不足，无法向水龙头合约转入资金！");
  }

  const tx = await deployer.sendTransaction({
    to: faucet.target,
    value: fundAmount
  });
  await tx.wait();

  console.log(`已向水龙头合约转入 ${hre.ethers.formatEther(fundAmount)} ETH`);
  
  // 设置较短的锁定时间（用于测试）
  const lockTime = 1 * 60; // 1分钟
  await faucet.setLockTime(lockTime);
  console.log("已将领取锁定时间设置为1分钟");

  // 设置每次可领取的数量
  const amount = hre.ethers.parseEther("1.0"); // 1 ETH
  await faucet.setAmountAllowed(amount);
  console.log("已将每次可领取数量设置为1 ETH");

  console.log("\n部署完成！用户现在可以调用以下地址的 requestTokens() 函数来获取测试用的以太币：");
  console.log("水龙头合约地址:", faucet.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 