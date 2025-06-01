// 部署 CrowdFundingFactory 和 CrowdFundingProposalManager 合约
// 并设置工厂合约中的提案管理器地址

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    // 获取部署者 (管理员) 的 signer
    const [deployer] = await ethers.getSigners();

    console.log("使用账户部署合约:", deployer.address);

    // 获取合约工厂
    const CrowdFundingFactory = await ethers.getContractFactory("CrowdFundingFactory");
    const CrowdFundingProposalManager = await ethers.getContractFactory("CrowdFundingProposalManager");

    // 1. 部署 CrowdFundingFactory 合约
    console.log("部署 CrowdFundingFactory...");
    const factory = await CrowdFundingFactory.deploy(deployer.address); // 将部署者设置为管理员
    await factory.waitForDeployment();
    const factoryAddress = await factory.target;
    console.log("CrowdFundingFactory 部署到:", factoryAddress);

    // 2. 部署 CrowdFundingProposalManager 合约
    console.log("部署 CrowdFundingProposalManager...");
    // 在构造函数中传入管理员地址和刚刚部署的工厂合约地址
    const proposalManager = await CrowdFundingProposalManager.deploy(deployer.address, factoryAddress);
    await proposalManager.waitForDeployment();
    const proposalManagerAddress = await proposalManager.target;
    console.log("CrowdFundingProposalManager 部署到:", proposalManagerAddress);

    // 3. 在 CrowdFundingFactory 中设置 CrowdFundingProposalManager 的地址
    console.log("在 CrowdFundingFactory 中设置 ProposalManager 地址...");
    const setTx = await factory.setProposalManagerAddress(proposalManagerAddress);
    await setTx.wait();
    console.log("已在 CrowdFundingFactory 中设置 ProposalManager 地址。");

    // 4. 将部署的地址写入文件
    const deployedAddressesPath = path.join(__dirname, '..', 'deployedAddresses.json');
    let deployedAddresses = {};

    if (fs.existsSync(deployedAddressesPath)) {
        deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    }

    deployedAddresses['geth'] = {
        CrowdFundingFactory: factoryAddress,
        CrowdFundingProposalManager: proposalManagerAddress
    };

    fs.writeFileSync(deployedAddressesPath, JSON.stringify(deployedAddresses, null, 2));
    console.log("合约地址已写入到 deployedAddresses.json");

    console.log("合约部署和配置完成。");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
