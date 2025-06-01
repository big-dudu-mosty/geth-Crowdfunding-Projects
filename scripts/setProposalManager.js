 // scripts/setProposalManager.js
const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const fs = require("fs");

async function main() {
    // 读取部署地址
    const addresses = JSON.parse(fs.readFileSync("deployments/addresses.json", "utf8"));
    const factoryAddress = addresses.factory;
    const proposalManagerAddress = addresses.proposalManager;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY; // 建议用环境变量传递私钥
    if (!factoryAddress || !proposalManagerAddress) {
        console.error("未找到工厂或提案管理器合约地址");
        process.exit(1);
    }
    if (!adminPrivateKey) {
        console.error("请将管理员私钥设置在环境变量 ADMIN_PRIVATE_KEY 中");
        process.exit(1);
    }
    const abi = [
        "function setProposalManagerAddress(address) public",
        "function proposalManagerAddress() view returns (address)"
    ];
    const provider = new JsonRpcProvider("http://127.0.0.1:8888");
    const wallet = new Wallet(adminPrivateKey, provider);
    const factory = new Contract(factoryAddress, abi, wallet);
    // 设置 proposalManager 地址
    const tx = await factory.setProposalManagerAddress(proposalManagerAddress);
    console.log("设置交易已发送，hash:", tx.hash);
    await tx.wait();
    const current = await factory.proposalManagerAddress();
    console.log("当前 proposalManagerAddress:", current);
    if (current.toLowerCase() === proposalManagerAddress.toLowerCase()) {
        console.log("设置成功！");
    } else {
        console.log("设置失败，请检查合约和私钥");
    }
}

main().catch(console.error);
