# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
npx hardhat comilpe
npx hardhat clean
npx hardhat run scripts/deploy.js --network geth
# 前端
    npx http-server frontend/ -p 8080 --cors
    # 设置权限审批
     node scripts/setProposalManager.js     
     $env:ADMIN_PRIVATE_KEY="b3485c49bd73808b310c853e6dccffc56f14ef7b4e032d2c5cb38e88368ae432"      
    #  查看项目
    node scripts/checkProposals.js   
```

前端
1. 用户端（user.html）
面向所有普通用户，包括众筹发起人和捐款人。
主要功能与页面逻辑
钱包连接
页面加载时自动检测 MetaMask（window.ethereum）。
未连接时弹出连接请求，连接后显示当前账户地址。
监听账户/网络切换，自动刷新页面或状态。
领取水龙头ETH
显示水龙头领取入口。
用户点击按钮，调用 Faucet 合约的 requestFunds()，通过钱包弹窗确认。
申请众筹项目
查看所有已部署的众筹项目
通过 Factory 合约的 getDeployedProjects() 获取所有项目地址。
读取每个项目的详细信息（名称、目标、已筹、状态等），展示为项目列表。
对项目进行捐款
在项目详情下输入捐款金额，点击“捐款”，通过钱包直接向项目合约地址发送ETH。
（可选）我的项目/退款/提取资金
查询自己发起的项目。
如果项目失败，调用 withdrawRefund() 退款。
如果项目成功，发起人调用 transferToInitiator() 提取资金。

2. 管理员端（admin.html）
面向平台管理员。
主要功能与页面逻辑
钱包连接
页面加载时自动检测 MetaMask。
连接后校验当前账户是否为管理员地址，否则提示无权限。
查看所有待审批的众筹提案
通过 ProposalManager 合约查询所有 Pending 状态的提案，展示为列表。
审批/拒绝提案
每个提案旁有“批准”与“拒绝”按钮。
批准时调用 approveProposal()，合约自动部署项目并记录地址。
拒绝时调用 rejectProposal()，提案状态变为 Rejected。
（可选）查看所有已部署项目
方便管理员全局管理和监控。


、前端与后端的交互点
所有合约地址都从 deployments/addresses.json 动态加载。
所有合约 ABI在前端定义，调用合约方法时用 ethers.js。
所有交易都通过用户钱包（MetaMask）发起，前端负责检测钱包连接状态并引导用户连接。
所有链上写操作（如提交提案、捐款、领取水龙头、审批提案）都必须通过钱包弹窗确认。
三、页面交互体验建议
页面顶部始终显示钱包连接状态和当前账户。
未连接钱包时，所有链上操作按钮禁用或提示“请先连接钱包”。
账户或网络切换时自动刷新页面或状态。
所有链上操作（如提交、捐款、领取、审批）都应有状态提示（如“等待钱包确认”、“交易成功/失败”）。
四、前端页面结构建议
用户端（user.html）
[顶部] 钱包连接状态 | 当前账户
[区块1] 水龙头领取 ETH
[区块2] 申请众筹表单
[区块3] 所有已部署项目列表（含捐款入口）
[区块4] （可选）我的项目/退款/提取资金

管理员端（admin.html）
[顶部] 钱包连接状态 | 当前账户（需校验管理员）
[区块1] 待审批提案列表（含批准/拒绝按钮）
[区块2] （可选）所有已部署项目列表

五、前端技术要点
钱包连接：ethers.js + window.ethereum
合约交互：ethers.js + 合约ABI + 合约地址
动态加载合约地址：fetch deployments/addresses.json
所有写操作都用 signer，读操作可用 provider
UI/UX：简洁明了，状态提示清晰