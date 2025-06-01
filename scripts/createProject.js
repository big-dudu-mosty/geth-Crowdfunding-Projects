const hre = require("hardhat");
const factoryAddress = "0x1FE414Ab1A3FCB7e1E26CF89E2D9D77cF9685B0F"; // 已根据 deployments/addresses.json 更新为实际部署的 CrowdFundingFactory 地址

async function main() {
  // 获取管理员账户 (Hardhat 配置的私钥对应账户)
  const [admin] = await hre.ethers.getSigners();
  console.log("使用管理员账户创建项目:", admin.address);

  // 获取 CrowdFundingFactory 合约实例
  const CrowdFundingFactory = await hre.ethers.getContractFactory("CrowdFundingFactory");
  const factory = await CrowdFundingFactory.attach(factoryAddress);

  // 项目参数
  const initiatorAddress = "0x75495d18342f5c3f320273fc4d5015a91ca881e6"; // 替换为您希望的项目发起人地址 (例如 Geth 中的另一个账户)
  const goal = hre.ethers.parseEther("50"); // 众筹目标：50 ETH
  // 选择截止日期时间
  const deadlineDate = "2024-07-01T12:00"; // 例：2024-07-01 12:00
  const deadline = Math.floor(new Date(deadlineDate).getTime() / 1000); // 转为秒
  const projectName = "我的第一个众筹项目"; // 项目名称

  console.log(`\n管理员 (${admin.address}) 正在创建新项目...`);
  console.log(`项目发起人: ${initiatorAddress}`);
  console.log(`目标金额: ${hre.ethers.formatEther(goal)} ETH`);
  console.log(`截止时间: ${deadline} (${deadlineDate})`);
  console.log(`项目名称: ${projectName}`);

  // 调用工厂合约的 createProject 函数
  const tx = await factory.connect(admin).createProject(initiatorAddress, goal, deadline, projectName);
  const receipt = await tx.wait();

  // 解析 ProjectCreated 事件来获取新创建的项目地址
  const event = receipt.logs?.find(log => {
      try {
          return factory.interface.parseLog(log).name === "ProjectCreated";
      } catch (e) {
          return false;
      }
  });

  if (event) {
      const parsedEvent = factory.interface.parseLog(event);
      const newProjectAddress = parsedEvent.args.projectAddress;
      console.log("\n新众筹项目已创建！");
      console.log("项目合约地址:", newProjectAddress);
      console.log("交易哈希:", tx.hash);
  } else {
      console.log("未找到 ProjectCreated 事件。项目可能创建失败或交易未包含事件。");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 