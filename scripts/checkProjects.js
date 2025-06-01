const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    // 读取工厂合约地址
    const addresses = JSON.parse(fs.readFileSync("deployments/addresses.json", "utf8"));
    const factoryAddress = addresses.factory;
    if (!factoryAddress) {
        console.error("未找到工厂合约地址");
        process.exit(1);
    }
    const factory = await ethers.getContractAt("CrowdFundingFactory", factoryAddress);
    const projects = await factory.getDeployedProjects();
    console.log("工厂合约地址:", factoryAddress);
    console.log("共检测项目数量:", projects.length);
    let validCount = 0;
    let invalidList = [];
    for (const addr of projects) {
        try {
            const project = await ethers.getContractAt("CrowdFundingProject", addr);
            const name = await project.name();
            console.log(`✅ 有效: ${addr} 名称: ${name}`);
            validCount++;
        } catch (e) {
            console.log(`❌ 异常: ${addr} 错误: ${e.message}`);
            invalidList.push(addr);
        }
    }
    console.log(`\n有效项目数量: ${validCount}`);
    if (invalidList.length > 0) {
        console.log("异常项目地址:", invalidList);
    } else {
        console.log("所有项目合约均有效");
    }
}

main().catch(console.error); 