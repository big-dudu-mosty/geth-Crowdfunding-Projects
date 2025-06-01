### 智能合约技术文档

#### 1. `CrowdFundingProject.sol`

*   **合约目的**: 代表一个单独的众筹项目。管理项目的状态、接收捐款、处理众筹结束的逻辑（成功或失败）以及处理失败项目的退款（Pull 模式）。

*   **状态变量**: 
    *   `initiator` (`address public`): 项目发起人的地址。
    *   `goalAmount` (`uint public`): 众筹的目标金额，单位是 Wei。
    *   `deadline` (`uint public`): 众筹的截止时间，表示为一个 Unix 时间戳。
    *   `raisedAmount` (`uint public`): 当前已筹集到的 Ether 总金额，单位是 Wei。
    *   `isEnded` (`bool public`): 表示众筹期是否已经结束。初始值为 `false`。
    *   `isSuccessful` (`bool public`): 表示众筹是否成功达到目标金额。在 `endFunding` 被调用后根据 `raisedAmount` 和 `goalAmount` 判断。初始值为 `false`。
    *   `donors` (`mapping(address => uint) public`): 映射，记录每个捐款人地址及其对应的捐款总金额（在项目失败时，表示可退款金额）。
    *   `adminAddress` (`address public`): 平台的管理员地址，在合约部署时设置。管理员拥有成功众筹后转移资金的权限。

*   **构造函数**: 
    *   `constructor(address _initiator, uint _goalAmount, uint _duration, address _adminAddress)`:
        *   在部署 `CrowdFundingProject` 合约时调用。
        *   初始化项目的发起人 (`initiator`)、目标金额 (`goalAmount`)、截止时间 (`deadline` = `block.timestamp` + `_duration`) 和管理员地址 (`adminAddress`)。
        *   初始化 `raisedAmount` 为 0，`isEnded` 和 `isSuccessful` 为 `false`。

*   **函数**: 
    *   `receive() external payable`:
        *   这是一个特殊函数，当有人直接向合约地址发送 Ether (且没有调用其他函数) 时会自动触发。
        *   `external payable`: 表示可以从外部调用并接收 Ether。
        *   `require(!isEnded, ...)`: 检查众筹是否已经结束。如果已结束则拒绝接收捐款。
        *   `donors[msg.sender] += msg.value`: 记录当前调用者 (`msg.sender`，即捐款人) 的捐款金额 (`msg.value`)。
        *   `raisedAmount += msg.value`: 更新项目的已筹集总金额。
        *   `emit DonationReceived(msg.sender, msg.value)`: 触发 `DonationReceived` 事件。
    *   `endFunding() public`:
        *   用于结束众筹期并判断项目是否成功。
        *   `require(!isEnded, ...)`: 检查众筹是否已经结束。
        *   `require(block.timestamp >= deadline, ...)`: 检查当前时间是否已达到或超过截止时间。
        *   将 `isEnded` 设置为 `true`。
        *   根据 `raisedAmount >= goalAmount` 判断并设置 `isSuccessful` 的值。
        *   `emit FundingEnded(isSuccessful, raisedAmount)`: 触发 `FundingEnded` 事件。
        *   **注意**: 当前设计任何人都可以调用此函数来结束已过期的众筹。在实际应用中，您可能希望只有发起人或管理员可以调用此函数，或者通过自动化服务在截止时间后调用。
    *   `withdrawRefund() public`:
        *   允许在众筹失败后，捐款人提取他们的退款（Pull 模式）。
        *   `require(isEnded, ...)`: 检查众筹是否已结束。
        *   `require(!isSuccessful, ...)`: 检查众筹项目是否失败。
        *   `uint refundAmount = donors[msg.sender]`: 获取当前调用者 (`msg.sender`) 在 `donors` 映射中记录的可退款金额。
        *   `require(refundAmount > 0, ...)`: 检查该地址是否有可退款金额。
        *   `donors[msg.sender] = 0`: 将该捐款人的可退款金额清零，防止重复提取。
        *   `(bool success, ) = payable(msg.sender).call{value: refundAmount}("")`: 使用低级 `call` 方法将退款金额发送回捐款人。
        *   `require(success, ...)`: 确保转账成功。
        *   `emit RefundWithdrawn(msg.sender, refundAmount)`: 触发 `RefundWithdrawn` 事件。
    *   `transferToInitiator() public`:
        *   在众筹成功后，用于将合约中筹集到的 Ether 转移给项目发起人。
        *   `require(isEnded, ...)`: 检查众筹是否已结束。
        *   `require(isSuccessful, ...)`: 检查众筹项目是否成功。
        *   `require(msg.sender == initiator || msg.sender == adminAddress, ...)`: **重要**：检查调用者必须是项目发起人**或者**管理员地址，确保资金只能由授权方转移。
        *   `uint balance = address(this).balance`: 获取合约当前的 Ether 余额。
        *   `(bool success, ) = payable(initiator).call{value: balance}("")`: 将合约的所有余额发送给项目发起人。
        *   `require(success, ...)`: 确保转账成功。

*   **事件**: 
    *   `DonationReceived(address donor, uint amount)`: 在成功接收一笔捐款时触发，记录捐款人地址和金额。
    *   `FundingEnded(bool success, uint raised)`: 在 `endFunding` 函数调用后触发，指示众筹是否成功 (`success`) 和最终筹集金额 (`raised`)。
    *   `RefundWithdrawn(address donor, uint amount)`: 在捐款人成功提取退款时触发，记录提取退款的捐款人地址和金额。

---

#### 2. `CrowdFundingFactory.sol`

*   **合约目的**: 负责部署和管理 `CrowdFundingProject` 合约实例。维护一个所有已部署项目地址的列表，并能按项目发起人查找其所有项目。强制要求管理员来触发新项目的创建。

*   **状态变量**: 
    *   `deployedProjects` (`address[] public`): 一个动态数组，存储所有通过此工厂合约部署的 `CrowdFundingProject` 合约的地址。
    *   `initiatorProjects` (`mapping(address => address[]) public`): 映射，键是项目发起人的地址，值是该发起人通过此工厂合约创建的所有众筹项目合约地址列表。
    *   `adminAddress` (`address public`): 平台的管理员地址，在工厂合约部署时设置。管理员是唯一有权限调用 `createProject` 函数的人。

*   **构造函数**: 
    *   `constructor(address _adminAddress)`:
        *   在部署 `CrowdFundingFactory` 合约时调用。
        *   初始化管理员地址 (`adminAddress`)。

*   **函数**: 
    *   `createProject(address _actualInitiator, uint _goalAmount, uint _duration) public returns (address)`:
        *   用于创建一个新的 `CrowdFundingProject` 合约实例。
        *   `public`: 可以从外部调用。
        *   `returns (address)`: 函数返回新创建的项目合约地址。
        *   `_actualInitiator` (`address`): 这个参数用于指定**真正的**项目发起人地址。
        *   `_goalAmount` (`uint`): 项目的目标金额。
        *   `_duration` (`uint`): 项目的持续时间。
        *   `require(msg.sender == adminAddress, ...)`: **重要**：强制要求调用此函数的地址必须是管理员地址。
        *   `require(_actualInitiator != address(0), ...)`: 确保传入的实际发起人地址不是零地址。
        *   `CrowdFundingProject newProject = new CrowdFundingProject(_actualInitiator, _goalAmount, _duration, adminAddress)`: 创建一个新的 `CrowdFundingProject` 合约实例。注意，这里将传入的 `_actualInitiator` 作为新项目的发起人。
        *   `deployedProjects.push(address(newProject))`: 将新项目地址添加到所有项目列表中。
        *   `initiatorProjects[_actualInitiator].push(address(newProject))`: 将新项目地址添加到实际发起人对应的项目列表中。
        *   `emit ProjectCreated(_actualInitiator, address(newProject), _goalAmount, block.timestamp + _duration)`: 触发 `ProjectCreated` 事件，其中包含实际发起人地址、新项目地址等信息。
        *   `return address(newProject)`: 返回新创建的项目合约地址。
    *   `getDeployedProjects() public view returns (address[] memory)`:
        *   `public view`: 可以从外部调用，不修改合约状态，免费调用。
        *   返回 `deployedProjects` 数组，即所有已部署众筹项目合约的地址列表。
    *   `getProjectsByInitiator(address _initiator) public view returns (address[] memory)`:
        *   `public view`: 可以从外部调用，不修改合约状态，免费调用。
        *   接收一个发起人地址 `_initiator`。
        *   返回 `initiatorProjects[_initiator]`，即该发起人创建的所有众筹项目合约的地址列表。

*   **事件**: 
    *   `ProjectCreated(address indexed initiator, address projectAddress, uint goalAmount, uint deadline)`: 在成功创建一个新的众筹项目合约时触发。`indexed` 关键字有助于在链下过滤和查找事件。记录了项目发起人（实际的申请人）、新创建的项目地址、目标金额和截止时间。

---

### 工厂模式下的合约、地址与管理员关系

为了实现一个可以创建多个独立众筹项目的平台，我们采用了工厂模式。这涉及到三个核心概念及其关系：工厂合约、工厂地址和管理员账户。

1.  **CrowdFundingFactory 合约**: 这是包含创建和管理众筹项目逻辑的智能合约代码。它就像一个"蓝图"或"程序"。

2.  **工厂地址 (例如: 0x3758... )**: 这是 CrowdFundingFactory 合约被部署到区块链上后获得的唯一地址。它代表了链上这个特定合约实例的"位置"或"身份"。所有与这个工厂合约的交互都必须通过这个地址进行。

3.  **管理员账户 (例如: 0x2088...)**: 这是具有特定权限的以太坊账户。在我们的设计中，管理员账户承担了部署工厂合约的任务，并且根据修改后的合约逻辑，**只有管理员账户有权限调用工厂合约中的 `createProject` 函数来创建新的众筹项目。**

**创建新的众筹项目时的流程和关系：**

要创建一个新的众筹项目（即部署一个新的 `CrowdFundingProject` 合约实例），需要以下步骤和角色协作：

*   **申请者**: 提供众筹项目的具体信息（目标金额、持续时间等）以及自己的以太坊地址（作为项目的真正发起人）。这些信息通常在链下收集（例如通过前端界面）。

*   **管理员**: 审核申请者的项目信息。审核通过后，管理员使用他们的账户（`0x2088...`）向区块链发送一个特殊的交易。
    *   这个交易的**发送方**是管理员账户。
    *   这个交易的**目标地址**是已部署的**工厂地址** (`0x3758...`)。
    *   交易的**数据**部分包含了调用工厂合约 `createProject` 函数的指令，以及项目信息和申请者的地址作为参数。

*   **工厂合约**: 当管理员发送的交易被区块链处理时，工厂合约（位于工厂地址上）的 `createProject` 函数会被执行。
    *   合约会验证调用者 (`msg.sender`) 是否确实是管理员。
    *   如果验证通过，工厂合约就会根据接收到的参数，动态地在链上创建一个全新的 `CrowdFundingProject` 合约实例。

*   **众筹项目合约实例**: 新创建的 `CrowdFundingProject` 合约实例会获得一个**独立的、新的合约地址**。这个地址才是该具体众筹项目的"捐款地址"和交互地址。

**总结：**

工厂地址 (`0x3758...`) 是管理员 (`0x2088...`) 用来触发创建新的众筹项目合约的**操作入口**。管理员不是直接创建众筹项目合约，而是通过向工厂地址发送交易来调用工厂合约的功能，由工厂合约来完成具体的项目合约部署工作。每次创建新项目都需要通过这个已部署的工厂地址来完成。 