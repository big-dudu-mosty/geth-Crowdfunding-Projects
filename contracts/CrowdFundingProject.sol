// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// 众筹项目合约：代表一个单独的众筹项目
contract CrowdFundingProject {
    // 项目发起人地址
    address public initiator;
    // 众筹目标金额
    uint public goalAmount;
    // 众筹截止时间 (Unix 时间戳)
    uint public deadline;
    // 当前已筹集到的金额
    uint public raisedAmount;
    // 众筹是否已结束
    bool public isEnded;
    // 众筹是否成功 (达到目标金额)
    bool public isSuccessful;

    // 捐款人地址到其捐款金额的映射
    mapping(address => uint) public donors;

    // 管理员地址 (用于执行特定管理操作，如成功后转移资金)
    address public adminAddress;

    // 项目名称
    string public name;

    // 捐款事件：在收到捐款时触发
    event DonationReceived(address donor, uint amount);
    // 众筹结束事件：在众筹期结束后触发，指示是否成功和最终筹集金额
    event FundingEnded(bool success, uint raised);
    // 退款提取事件：在捐款人提取退款时触发
    event RefundWithdrawn(address donor, uint amount);

    // 构造函数：在部署合约时初始化项目参数
    constructor(address _initiator, uint _goalAmount, uint _deadline, address _adminAddress, string memory _name) {
        initiator = _initiator;
        goalAmount = _goalAmount;
        // 截止时间直接由外部传入
        deadline = _deadline;
        raisedAmount = 0;
        isEnded = false;
        isSuccessful = false;
        adminAddress = _adminAddress; // 初始化管理员地址
        name = _name; // 初始化项目名称
    }

    // receive 函数：用于接收直接发送到合约的 Ether 捐款
    receive() external payable {
        // 要求众筹未结束
        require(!isEnded, "CrowdFunding: Project has ended.");
        // 记录捐款人的捐款金额
        donors[msg.sender] += msg.value;
        // 更新已筹集金额
        raisedAmount += msg.value;
        // 触发捐款事件
        emit DonationReceived(msg.sender, msg.value);
    }

    // endFunding 函数：结束众筹期，判断众筹是否成功
    function endFunding() public {
        // 要求众筹未结束
        require(!isEnded, "CrowdFunding: Project already ended.");
        // 要求当前时间已达到或超过截止时间
        require(block.timestamp >= deadline, "CrowdFunding: Funding period not over yet.");

        // 标记众筹已结束
        isEnded = true;
        // 判断是否达到目标金额
        if (raisedAmount >= goalAmount) {
            isSuccessful = true;
        } else {
            isSuccessful = false;
        }
        // 触发众筹结束事件
        emit FundingEnded(isSuccessful, raisedAmount);
    }

    // withdrawRefund 函数：允许失败项目的捐款人提取退款 (Pull 模式)
    function withdrawRefund() public {
        // 要求众筹已结束
        require(isEnded, "CrowdFunding: Project not ended.");
        // 要求众筹项目失败
        require(!isSuccessful, "CrowdFunding: Project was successful.");

        // 获取当前调用者 (捐款人) 可退款的金额
        uint refundAmount = donors[msg.sender];
        // 要求可退款金额大于 0
        require(refundAmount > 0, "CrowdFunding: No refund available for this address.");

        // 将该捐款人的可退款金额清零，防止重复提取
        donors[msg.sender] = 0;
        // 将退款发送给捐款人
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        // 要求转账成功
        require(success, "CrowdFunding: Refund withdrawal failed.");

        // 触发退款提取事件
        emit RefundWithdrawn(msg.sender, refundAmount);
    }

    // transferToInitiator 函数：在众筹成功后将筹集资金转移给项目发起人
    function transferToInitiator() public {
        // 要求众筹已结束
        require(isEnded, "CrowdFunding: Project not ended.");
        // 要求众筹项目成功
        require(isSuccessful, "CrowdFunding: Project was not successful.");
        // 只有项目发起人或指定的管理员可以调用此函数
        require(msg.sender == initiator || msg.sender == adminAddress, "CrowdFunding: Not authorized.");

        // 获取合约当前的余额
        uint balance = address(this).balance;
        // 在实际应用中，需要考虑 gas 费用等可能导致的小额差异
        // 为了简化，此处假设合约余额即为筹集总金额

        // 将合约所有余额发送给项目发起人
        (bool success, ) = payable(initiator).call{value: balance}("");
        // 要求转账成功
        require(success, "CrowdFunding: Transfer to initiator failed.");
    }
} 