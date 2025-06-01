const { JsonRpcProvider, Contract, formatEther } = require("ethers");
const fs = require("fs");

async function main() {
    const addresses = JSON.parse(fs.readFileSync("deployments/addresses.json", "utf8"));
    const proposalManagerAddress = addresses.proposalManager;
    if (!proposalManagerAddress) {
        console.error("未找到 proposalManager 合约地址");
        process.exit(1);
    }
    const abi = [
        "function getProposalsCount() view returns (uint256)",
        "function getProposal(uint256 _proposalId) view returns (address applicant, uint256 goal, uint256 deadline, string offchainDataHash, uint8 status, address deployedProject, string name)"
    ];
    const provider = new JsonRpcProvider("http://127.0.0.1:8888");
    const contract = new Contract(proposalManagerAddress, abi, provider);
    try {
        const count = await contract.getProposalsCount();
        console.log("getProposalsCount:", count.toString());
        if (count > 0) {
            try {
                const p = await contract.getProposal(0);
                console.log("getProposal(0):", p);
                // 打印详细字段
                console.log("申请人:", p.applicant);
                console.log("目标金额:", formatEther(p.goal));
                console.log("截止时间:", new Date(Number(p.deadline) * 1000).toLocaleString());
                console.log("链下数据哈希:", p.offchainDataHash);
                console.log("状态:", ["Pending", "Approved", "Rejected"][Number(p.status)]);
                console.log("已部署项目:", p.deployedProject);
                console.log("项目名称:", p.name);
            } catch (err) {
                console.error("getProposal(0) 异常:", err.message);
            }
        } else {
            console.log("没有任何提案");
        }
    } catch (err) {
        console.error("getProposalsCount 异常:", err.message);
    }
}

main().catch(console.error);