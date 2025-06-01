// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Faucet {
    address public owner;
    uint256 public amountAllowed = 1 ether; // 每次允许领取的数量
    uint256 public lockTime = 1; // 每个地址领取后需要等待的时间（1秒）
    mapping(address => uint256) public lastAccessTime; // 记录每个地址上次领取的时间

    event FundsSent(address indexed recipient, uint256 amount);
    event FundsReceived(address indexed sender, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // 接收资金
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // 修改每次可领取的数量（仅管理员）
    function setAmountAllowed(uint256 _amount) external {
        require(msg.sender == owner, "Only owner can change amount");
        amountAllowed = _amount;
    }

    // 修改锁定时间（仅管理员）
    function setLockTime(uint256 _time) external {
        require(msg.sender == owner, "Only owner can change lock time");
        lockTime = _time;
    }

    // 领取测试币
    function requestTokens() external {
        require(
            block.timestamp >= lastAccessTime[msg.sender] + lockTime,
            "Please wait before requesting again"
        );
        require(
            address(this).balance >= amountAllowed,
            "Insufficient balance in faucet"
        );

        lastAccessTime[msg.sender] = block.timestamp;
        
        (bool sent, ) = msg.sender.call{value: amountAllowed}("");
        require(sent, "Failed to send Ether");
        
        emit FundsSent(msg.sender, amountAllowed);
    }

    // 提取合约中的资金（仅管理员）
    function withdraw(uint256 _amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(address(this).balance >= _amount, "Insufficient balance");
        
        (bool sent, ) = msg.sender.call{value: _amount}("");
        require(sent, "Failed to send Ether");
    }

    // 查询合约余额
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 