// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; // 使用与您的 Hardhat 配置匹配的版本

import "./CrowdFundingProject.sol";
import "hardhat/console.sol";

contract CrowdFundingFactory {
    address[] public deployedProjects; // 存储所有已部署的项目合约地址
    mapping(address => address[]) public initiatorProjects; // 存储每个发起人对应的项目合约地址列表

    address public adminAddress; // 管理员地址
    address public proposalManagerAddress; // 提案管理器合约地址

    // 项目创建事件
    event ProjectCreated(
        address indexed initiator,
        address indexed projectAddress,
        string name
    );

    modifier onlyAdminOrProposalManager() {
        // 允许管理员或提案管理器合约调用
        require(
            msg.sender == adminAddress || msg.sender == proposalManagerAddress,
            "CrowdFundingFactory: Not authorized to create projects."
        );
        _;
    }

    // 新增 onlyAdmin Modifier
    modifier onlyAdmin() {
        require(
            msg.sender == adminAddress,
            "CrowdFundingFactory: Only admin can call this function."
        );
        _;
    }

    constructor(address _adminAddress) {
        adminAddress = _adminAddress;
        // 在部署工厂合约时，提案管理器合约地址未知，可以在部署后通过一个 setter 函数设置
    }

    // 新增 setter 函数，用于在部署提案管理器合约后设置其地址
    function setProposalManagerAddress(
        address _proposalManagerAddress
    ) public onlyAdmin {
        require(
            _proposalManagerAddress != address(0),
            "CrowdFundingFactory: Invalid proposal manager address."
        );
        proposalManagerAddress = _proposalManagerAddress;
    }

    // 创建新的众筹项目合约
    // 只能由管理员或提案管理器合约调用
    function createProject(
        address _actualInitiator, // 实际的项目发起人地址
        uint256 _goal,
        uint256 _deadline,
        string memory _name // 新增项目名称参数
    ) public onlyAdminOrProposalManager returns (address) {
        console.log("[Factory] createProject called");
        console.log("sender:", msg.sender);
        console.log("initiator:", _actualInitiator);
        console.log("goal:", _goal);
        console.log("deadline:", _deadline);
        console.log("name:", _name);
        require(
            _actualInitiator != address(0),
            "CrowdFundingFactory: Invalid initiator address."
        );

        // 部署新的 CrowdFundingProject 合约
        CrowdFundingProject newProject = new CrowdFundingProject(
            _actualInitiator,
            _goal,
            _deadline,
            adminAddress, // 将管理员地址也传递给项目合约
            _name // 传递项目名称
        );

        // 存储项目合约地址
        deployedProjects.push(address(newProject));
        initiatorProjects[_actualInitiator].push(address(newProject));

        // 触发项目创建事件
        emit ProjectCreated(_actualInitiator, address(newProject), _name);

        return address(newProject);
    }

    // 获取所有已部署的项目合约地址列表
    function getDeployedProjects() public view returns (address[] memory) {
        console.log(
            "[Factory] getDeployedProjects called, sender: %s, total: %s",
            msg.sender,
            deployedProjects.length
        );
        return deployedProjects;
    }

    // 根据发起人地址获取其对应的项目合约地址列表
    function getProjectsByInitiator(
        address _initiator
    ) public view returns (address[] memory) {
        console.log(
            "[Factory] getProjectsByInitiator called, sender: %s, initiator: %s, count: %s",
            msg.sender,
            _initiator,
            initiatorProjects[_initiator].length
        );
        return initiatorProjects[_initiator];
    }
}
