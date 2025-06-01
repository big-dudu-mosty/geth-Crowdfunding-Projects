// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 导入 CrowdFundingFactory 合约接口，以便调用其函数
import "./CrowdFundingFactory.sol";

contract CrowdFundingProposalManager {
    struct Proposal {
        address applicant; // 提案申请人地址
        uint256 goal; // 众筹目标金额
        uint256 deadline; // 众筹截止时间 (Unix 时间戳)
        string offchainDataHash; // 链下数据标识符 (例如 IPFS hash 或数据库 ID)
        ProposalStatus status; // 提案状态
        address deployedProject; // 批准后部署的项目合约地址
        string name; // 新增项目名称字段
    }

    enum ProposalStatus {
        Pending,
        Approved,
        Rejected
    }

    Proposal[] public proposals; // 存储所有提案

    address public adminAddress; // 管理员地址
    CrowdFundingFactory public factory; // CrowdFundingFactory 合约实例

    // 提案提交事件
    event ProposalSubmitted(
        uint256 proposalId,
        address indexed applicant,
        uint256 goal,
        uint256 deadline,
        string offchainDataHash,
        string name // 在事件中也包含项目名称
    );

    // 提案状态更新事件
    event ProposalStatusUpdated(
        uint256 indexed proposalId,
        ProposalStatus newStatus,
        address indexed admin
    );

    // 项目部署事件 (在批准提案并创建项目后触发)
    event ProjectDeployedFromProposal(
        uint256 indexed proposalId,
        address indexed applicant,
        address indexed projectAddress
    );

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "ProposalManager: Not authorized.");
        _;
    }

    // 构造函数 初始化管理员地址和工厂合约地址
    constructor(address _adminAddress, address _factoryAddress) {
        require(
            _factoryAddress != address(0),
            "ProposalManager: Invalid factory address."
        );
        adminAddress = _adminAddress;
        factory = CrowdFundingFactory(_factoryAddress); // 初始化工厂合约实例
    }

    // 申请人提交众筹提案
    function submitProposal(
        uint256 _goal,
        uint256 _deadline,
        string memory _offchainDataHash,
        string memory _name // 新增项目名称参数
    ) public {
        uint256 proposalId = proposals.length;
        proposals.push(
            Proposal(
                msg.sender,
                _goal,
                _deadline,
                _offchainDataHash,
                ProposalStatus.Pending,
                address(0), // 初始时没有部署的项目地址
                _name // 存储项目名称
            )
        );

        emit ProposalSubmitted(
            proposalId,
            msg.sender,
            _goal,
            _deadline,
            _offchainDataHash,
            _name // 在事件中发出项目名称
        );
    }

    // 管理员批准提案并创建众筹项目
    function approveProposal(uint256 _proposalId) public onlyAdmin {
        require(
            _proposalId < proposals.length,
            "ProposalManager: Invalid proposal ID."
        );
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.status == ProposalStatus.Pending,
            "ProposalManager: Proposal is not pending."
        );

        // 调用工厂合约创建项目，并将申请人设置为实际发起人
        address newProjectAddress = factory.createProject(
            proposal.applicant,
            proposal.goal,
            proposal.deadline,
            proposal.name // 从提案结构体获取名称并传递给 factory
        );

        proposal.status = ProposalStatus.Approved;
        proposal.deployedProject = newProjectAddress; // 存储部署的项目地址

        emit ProposalStatusUpdated(
            _proposalId,
            ProposalStatus.Approved,
            msg.sender
        );
        emit ProjectDeployedFromProposal(
            _proposalId,
            proposal.applicant,
            newProjectAddress
        ); // 触发项目部署事件
    }

    // 管理员拒绝提案
    function rejectProposal(uint256 _proposalId) public onlyAdmin {
        require(
            _proposalId < proposals.length,
            "ProposalManager: Invalid proposal ID."
        );
        Proposal storage proposal = proposals[_proposalId];
        require(
            proposal.status == ProposalStatus.Pending,
            "ProposalManager: Proposal is not pending."
        );

        proposal.status = ProposalStatus.Rejected;

        emit ProposalStatusUpdated(
            _proposalId,
            ProposalStatus.Rejected,
            msg.sender
        );
    }

    // 获取所有提案 (注意：实际应用中，为了效率通常不会一次性获取所有数据，这里仅用于测试/演示)
    function getAllProposals() public view returns (Proposal[] memory) {
        return proposals;
    }

    function getProposal(
        uint256 _proposalId
    )
        public
        view
        returns (
            address applicant,
            uint256 goal,
            uint256 deadline,
            string memory offchainDataHash,
            uint8 status,
            address deployedProject,
            string memory name
        )
    {
        require(
            _proposalId < proposals.length,
            "ProposalManager: Invalid proposal ID."
        );
        Proposal storage p = proposals[_proposalId];
        return (
            p.applicant,
            p.goal,
            p.deadline,
            p.offchainDataHash,
            uint8(p.status),
            p.deployedProject,
            p.name
        );
    }

    // 根据状态获取提案 (示例，未实现完整过滤逻辑)
    // function getProposalsByStatus(ProposalStatus _status) public view returns (Proposal[] memory) {
    //     // 实现过滤逻辑
    // }

    // 根据申请人地址获取提案 (示例，未实现完整过滤逻辑)
    // function getProposalsByApplicant(address _applicant) public view returns (Proposal[] memory) {
    //     // 实现过滤逻辑
    // }

    // 获取提案数量
    function getProposalsCount() public view returns (uint256) {
        return proposals.length;
    }
}
