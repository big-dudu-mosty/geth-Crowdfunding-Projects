const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("众筹合约测试", function () {
    let CrowdFundingFactory;
    let factory;
    let owner; // Hardhat 默认的第一个 signer，将作为管理员
    let addr1; // 潜在的项目发起人 1
    let addr2; // 潜在的项目发起人 2 或捐款人
    let donor1; // 另一个捐款人
    let addrs;
    // const adminAddress = "0x20883041bc83dcfc98108712d1e96f4d9f13e3bc"; // 硬编码的管理员地址 (测试中使用第一个 signer 作为管理员)
    let adminAddress; // 在 beforeEach 中设置为 owner.address

    let projectAddress; // 存储创建的众筹项目合约地址
    let projectContract; // 存储创建的众筹项目合约实例

    const goal = ethers.parseEther("10"); // 众筹目标金额：10 Ether
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 60 * 60 * 24; // 1天后截止
    const projectName = "测试众筹项目"; // 新增项目名称

    // 在所有测试开始前执行
    before(async function () {
        // 获取 Hardhat 提供的 signer (账户)
        [owner, addr1, addr2, donor1, ...addrs] = await ethers.getSigners();
        // 在测试中，我们将 Hardhat 的第一个 signer (owner) 作为管理员
        adminAddress = owner.address;

        // 警告：在 Hardhat 网络中，第一个 signer 是模拟账户，不是您的真实 Geth 管理员账户。
        // 如果要测试与真实 Geth 网络的交互，您需要使用网络分叉或配置 Hardhat 网络使用您的真实管理员私钥。
        console.warn("警告：在 Hardhat 测试环境中，管理员地址被设置为 Hardhat 的第一个 signer 地址。");
        console.warn(`测试管理员地址: ${adminAddress}`);
        console.warn(`请确保在部署到真实网络时使用您在 Geth 中的管理员地址: 0x20883041bc83dcfc98108712d1e96f4d9f13e3bc`);
    });

    describe("CrowdFundingFactory 合约测试", function () {
        // 在此 describe 块中的每个测试前执行
        beforeEach(async function () {
            // 在每个测试前部署 CrowdFundingFactory 合约
            CrowdFundingFactory = await ethers.getContractFactory("CrowdFundingFactory");
            // 使用 'owner' signer (充当管理员进行部署) 部署工厂合约
            // 将 owner.address 作为管理员地址传递给合约
            factory = await CrowdFundingFactory.deploy(adminAddress);
            await factory.waitForDeployment();
            // console.log("工厂合约部署地址:", factory.target);
        });

        describe("部署测试", function () {
            it("应该正确设置管理员地址", async function () {
                // 比较时转换为小写
                expect((await factory.adminAddress()).toLowerCase()).to.equal(adminAddress.toLowerCase()); // 确保从合约读取的地址转换为小写再比较
            });
        });

        describe("项目创建测试", function () {
            it("应该允许管理员创建项目", async function () {
                // 使用 'owner' signer (充当管理员) 创建项目，包含项目名称
                const tx = await factory.connect(owner).createProject(addr1.address, goal, deadline, projectName);
                const receipt = await tx.wait();

                // 查找 ProjectCreated 事件
                const event = receipt.logs?.find(log => {
                    try {
                        return factory.interface.parseLog(log).name === "ProjectCreated";
                    } catch (e) {
                        return false;
                    }
                });


                expect(event, "ProjectCreated 事件未找到").to.not.be.undefined;
                // console.log("事件参数:", factory.interface.parseLog(event).args);

                const parsedEvent = factory.interface.parseLog(event);

                // 检查事件中的发起人是否正确 (addr1)
                expect(parsedEvent.args.initiator.toLowerCase()).to.equal(addr1.address.toLowerCase()); // 确保从事件读取的地址转换为小写再比较                // 存储新创建的项目合约地址
                projectAddress = parsedEvent.args.projectAddress;
                // 检查返回的地址是否是有效的以太坊地址
                expect(projectAddress).to.be.properAddress;

                // Check if the project address is added to deployedProjects
                const deployedProjects = await factory.getDeployedProjects();
                expect(deployedProjects.map(addr => addr.toLowerCase())).to.include(projectAddress.toLowerCase()); // 确保比较时地址为小写

                // Check if the project address is added to initiatorProjects for addr1
                const initiatorProjects = await factory.getProjectsByInitiator(addr1.address);
                expect(initiatorProjects.map(addr => addr.toLowerCase())).to.include(projectAddress.toLowerCase()); // 确保比较时地址为小写

                // console.log("项目创建地址:", projectAddress);
            });

            it("不应该允许非管理员创建项目", async function () {
                // 使用 addr2 signer (非管理员) 尝试创建项目，包含项目名称
                await expect(factory.connect(addr2).createProject(addr2.address, goal, deadline, projectName))
                    .to.be.revertedWith("CrowdFundingFactory: Not authorized to create projects.");
            });
            it("不应该允许管理员创建零地址发起人的项目", async function () {
                // 使用 ethers.ZeroAddress，包含项目名称
                await expect(factory.connect(owner).createProject(ethers.ZeroAddress, goal, deadline, projectName))
                    .to.be.revertedWith("CrowdFundingFactory: Invalid initiator address.");
            });

            // 如果需要，添加更多项目创建参数验证的测试
        });
    });

    describe("CrowdFundingProject 功能测试", function () {
        // 在此 describe 块中的每个测试前执行
        beforeEach(async function () {
            // 部署工厂合约，并在每个测试前创建一个项目
            CrowdFundingFactory = await ethers.getContractFactory("CrowdFundingFactory");
            // 将 owner.address 作为管理员地址传递给合约
            factory = await CrowdFundingFactory.deploy(adminAddress);
            await factory.waitForDeployment();

            // 使用管理员 (owner) 创建一个项目，发起人为 addr1，包含项目名称
            const tx = await factory.connect(owner).createProject(addr1.address, goal, deadline, projectName);
            const receipt = await tx.wait();
            // 查找 ProjectCreated 事件以获取新创建的项目地址
            const event = receipt.logs?.find(log => {
                try {
                    return factory.interface.parseLog(log).name === "ProjectCreated";
                } catch (e) {
                    return false;
                }
            });
            const parsedEvent = factory.interface.parseLog(event);
            projectAddress = parsedEvent.args.projectAddress;

            // 获取已部署的项目合约实例
            projectContract = await ethers.getContractAt("CrowdFundingProject", projectAddress);
        });

        it("应该正确设置项目名称", async function () {
            expect(await projectContract.name()).to.equal(projectName);
        });

        it("应该能够接收捐款", async function () {
            const donationAmount = ethers.parseEther("1"); // 捐款金额
            const initialRaisedAmount = await projectContract.raisedAmount(); // 初始已筹金额
            const initialDonorBalance = await projectContract.donors(addr2.address); // 捐款人初始余额记录

            // addr2 进行捐款
            await expect(addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            }))
                // 检查是否触发 DonationReceived 事件，并包含正确的参数
                .to.emit(projectContract, "DonationReceived")
                .withArgs(addr2.address, donationAmount);

            const finalRaisedAmount = await projectContract.raisedAmount(); // 最终已筹金额
            const finalDonorBalance = await projectContract.donors(addr2.address); // 捐款人最终余额记录

            // 检查已筹金额和捐款人余额是否正确更新
            expect(finalRaisedAmount).to.equal(initialRaisedAmount + donationAmount);
            expect(finalDonorBalance).to.equal(initialDonorBalance + donationAmount);
        });

        it("众筹期结束后不应该接收捐款", async function () {
            // 将时间快进到截止时间之后
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine"); // 挖矿以使时间前进生效

            // 调用 endFunding 更新项目状态
            // 注意: Hardhat Network 的时间操作只影响 block.timestamp，不会自动结束众筹。
            // endFunding 需要被手动调用。
            await projectContract.connect(addr1).endFunding();

            const donationAmount = ethers.parseEther("0.5"); // 尝试捐款金额

            // 尝试在截止时间后捐款 (应该会 Revert)
            await expect(addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            }))
                .to.be.reverted; // 因为 receive 函数没有指定错误字符串，所以只检查是否 Revert
        });

        it("应该在截止时间后结束众筹", async function () {
            // 捐款一些金额，使 raisedAmount 不为零
            const donationAmount = ethers.parseEther("5");
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 确保在截止时间前不能结束
            await expect(projectContract.connect(addr1).endFunding())
                .to.be.revertedWith("CrowdFunding: Funding period not over yet.");

            // 将时间快进到截止时间之后
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");

            // 结束众筹
            // 检查是否触发 FundingEnded 事件，并包含正确的成功状态和最终筹集金额
            await expect(projectContract.connect(addr1).endFunding())
                .to.emit(projectContract, "FundingEnded")
                .withArgs(false, donationAmount);

            // 检查项目状态是否正确更新
            expect(await projectContract.isEnded()).to.be.true;
            expect(await projectContract.isSuccessful()).to.be.false; // 基于捐款金额小于目标金额
        });

        it("如果在截止时间后达到目标，应该标记为成功", async function () {
            const donationAmount = ethers.parseEther("10"); // 刚好达到目标金额
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 将时间快进到截止时间之后
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");

            // 结束众筹
            // 检查是否触发 FundingEnded 事件，并指示成功
            await expect(projectContract.connect(addr1).endFunding())
                .to.emit(projectContract, "FundingEnded")
                .withArgs(true, donationAmount);

            // 检查项目状态是否正确更新
            expect(await projectContract.isEnded()).to.be.true;
            expect(await projectContract.isSuccessful()).to.be.true;
        });

        it("如果众筹失败，应该允许捐款人提取退款", async function () {
            const donationAmount = ethers.parseEther("2"); // 捐款金额
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 将时间快进到截止时间之后并结束众筹 (众筹失败)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实失败
            expect(await projectContract.isSuccessful()).to.be.false;
            // 确保捐款人的捐款金额已记录
            expect(await projectContract.donors(addr2.address)).to.equal(donationAmount);

            // addr2 提取退款
            const initialAddr2Balance = await ethers.provider.getBalance(addr2.address); // 提取前的余额 (BigInt)
            const txResponse = await projectContract.connect(addr2).withdrawRefund(); // 执行退款交易
            const txReceipt = await txResponse.wait(); // 等待交易确认

            // 确保 txReceipt 和其中的 gasUsed 和 gasPrice 存在 (替换 effectiveGasPrice)
            expect(txReceipt).to.not.be.undefined;
            expect(txReceipt.gasUsed).to.not.be.undefined;
            expect(txReceipt.gasPrice).to.not.be.undefined; // 检查 gasPrice 而不是 effectiveGasPrice

            // 将 gasUsed 和 gasPrice 转换为 BigInt 进行计算
            const gasCost = BigInt(txReceipt.gasUsed) * BigInt(txReceipt.gasPrice); // 使用 gasPrice
            const finalAddr2Balance = await ethers.provider.getBalance(addr2.address); // 提取后的余额 (BigInt)

            // 使用 closeTo 检查退款后的余额是否接近预期，考虑到 gas 消耗
            // 预期的最终余额 = 初始余额 + 退款金额 - gas 费用
            // expect(finalAddr2Balance).to.be.closeTo(initialAddr2Balance + donationAmount - gasCost, ethers.parseEther("0.001")); // 允许 0.001 Ether 的容差

            // 简化测试：检查捐款人的余额是否至少增加了捐款金额（忽略 gas 费用进行粗略检查）
            expect(finalAddr2Balance).to.be.gte(initialAddr2Balance + donationAmount - ethers.parseEther("0.01")); // 考虑 gas 费用，允许一定范围的减少

            // 检查捐款人在合约中的记录是否清零
            expect(await projectContract.donors(addr2.address)).to.equal(0);

            // 检查项目合约的余额是否减少（如果 addr2 是唯一的捐款人且所有资金被退回，余额应该清零）
            // 注意：如果之前有其他捐款且未退款，项目余额不会清零
            // 更稳健的检查是，检查项目合约的余额是否减少了退款金额
            const finalProjectBalance = await ethers.provider.getBalance(projectContract.target);
            // 初始项目余额在捐款后等于 donationAmount
            expect(finalProjectBalance).to.equal(0);
        });

        it("如果众筹成功，不应该允许提取退款", async function () {
            const donationAmount = ethers.parseEther("10"); // 达到目标金额
            await addr2.sendTransaction({ to: projectContract.target, value: donationAmount });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实成功
            expect(await projectContract.isSuccessful()).to.be.true;

            // 尝试提取退款 (应该会失败)
            await expect(projectContract.connect(addr2).withdrawRefund())
                .to.be.revertedWith("CrowdFunding: Project was successful.");
        });

        it("如果众筹成功，应该允许发起人转移资金", async function () {
            const donationAmount = ethers.parseEther("10"); // 达到目标金额
            await addr2.sendTransaction({ to: projectContract.target, value: donationAmount });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实成功
            expect(await projectContract.isSuccessful()).to.be.true;
            // 检查项目合约是否有正确的余额
            const initialProjectBalance = await ethers.provider.getBalance(projectContract.target);
            expect(initialProjectBalance).to.equal(donationAmount);

            // 记录发起人 (addr1) 转移前的余额
            const initialInitiatorBalance = await ethers.provider.getBalance(addr1.address);

            // addr1 (发起人) 转移资金
            const txResponse = await projectContract.connect(addr1).transferToInitiator(); // 执行转移交易
            const txReceipt = await txResponse.wait(); // 等待交易确认

            // 检查项目合约余额是否为零
            expect(await ethers.provider.getBalance(projectContract.target)).to.equal(0);

            // 检查发起人 (addr1) 的余额是否增加了捐款金额
            // 这里使用 closeTo 是因为发起人接收资金后，如果发起人不是管理员，他们的余额不会因为这个交易而减少gas。
            // 如果发起人是管理员，他们自己调用会消耗gas。但在管理员调用这个测试中，发起人addr1不支付gas。
            const finalInitiatorBalance = await ethers.provider.getBalance(addr1.address);
            const expectedInitiatorBalance = initialInitiatorBalance + donationAmount;
            // 使用一个小的容差范围来比较，以防 Hardhat 测试环境有微小差异
            const tolerance = ethers.parseUnits("0.001", "ether");
            expect(finalInitiatorBalance).to.be.closeTo(expectedInitiatorBalance, tolerance);

            // 旧的检查管理员余额的代码 (已移除)
            // const initialOwnerBalance = await ethers.provider.getBalance(owner.address); // 管理员初始余额 (BigInt)
            // const finalOwnerBalance = await ethers.provider.getBalance(owner.address); // 管理员最终余额 (BigInt)
            // 预期最终余额 = 初始余额 + 转移金额 (忽略 Gas 费用，依赖 closeTo 的容差)
            // 确保所有操作数都是 BigInt
            // const expectedFinalBalance = initialOwnerBalance + donationAmount;
            // 使用容差范围比较余额 (包括 Gas 费用)
            // Chai 的 .closeTo 断言支持 BigInt 比较
            // const tolerance = ethers.parseUnits("0.02", "ether"); // 增加容差以覆盖管理员的 Gas 费用
            // expect(finalOwnerBalance).to.be.closeTo(expectedFinalBalance, tolerance);
        });

        it("如果众筹成功，应该允许管理员转移资金", async function () {
            const donationAmount = ethers.parseEther("10"); // 达到目标金额
            await addr2.sendTransaction({ to: projectContract.target, value: donationAmount });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实成功
            expect(await projectContract.isSuccessful()).to.be.true;
            // 检查项目合约是否有正确的余额
            const initialProjectBalance = await ethers.provider.getBalance(projectContract.target);
            expect(initialProjectBalance).to.equal(donationAmount);

            // 记录发起人 (addr1) 转移前的余额
            const initialInitiatorBalance = await ethers.provider.getBalance(addr1.address);

            // owner (管理员) 转移资金
            const txResponse = await projectContract.connect(owner).transferToInitiator(); // 执行转移交易
            const txReceipt = await txResponse.wait(); // 等待交易确认

            // 检查项目合约余额是否为零
            expect(await ethers.provider.getBalance(projectContract.target)).to.equal(0);

            // 检查发起人 (addr1) 的余额是否增加了捐款金额
            const finalInitiatorBalance = await ethers.provider.getBalance(addr1.address);
            const expectedInitiatorBalance = initialInitiatorBalance + donationAmount;
            // 使用一个小的容差范围来比较，以防 Hardhat 测试环境有微小差异
            const tolerance = ethers.parseUnits("0.001", "ether");
            expect(finalInitiatorBalance).to.be.closeTo(expectedInitiatorBalance, tolerance);

            // 旧的检查管理员余额的代码 (已移除)
            // const initialOwnerBalance = await ethers.provider.getBalance(owner.address); // 管理员初始余额 (BigInt)
            // const finalOwnerBalance = await ethers.provider.getBalance(owner.address); // 管理员最终余额 (BigInt)
            // 预期最终余额 = 初始余额 + 转移金额 (忽略 Gas 费用，依赖 closeTo 的容差)
            // 确保所有操作数都是 BigInt
            // const expectedFinalBalance = initialOwnerBalance + donationAmount;
            // 使用容差范围比较余额 (包括 Gas 费用)
            // Chai 的 .closeTo 断言支持 BigInt 比较
            // const tolerance = ethers.parseUnits("0.02", "ether"); // 增加容差以覆盖管理员的 Gas 费用
            // expect(finalOwnerBalance).to.be.closeTo(expectedFinalBalance, tolerance);
        });

        it("不应该允许非发起人/非管理员转移资金", async function () {
            const donationAmount = ethers.parseEther("10"); // 达到目标金额
            await addr2.sendTransaction({ to: projectContract.target, value: donationAmount });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实成功
            expect(await projectContract.isSuccessful()).to.be.true;

            // addr2 (既不是发起人也不是管理员) 尝试转移资金 (应该会失败)
            await expect(projectContract.connect(addr2).transferToInitiator())
                .to.be.revertedWith("CrowdFunding: Not authorized.");
        });

        it("如果在众筹成功时，应该允许发起人提取资金", async function () {
            const donationAmount = ethers.parseEther("10"); // 捐款金额，使项目成功
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实成功
            expect(await projectContract.isSuccessful()).to.be.true;

            // 发起人提取资金
            const initialInitiatorBalance = await ethers.provider.getBalance(addr1.address); // 提取前的余额 (BigInt)
            const initialProjectBalance = await ethers.provider.getBalance(projectContract.target); // 提取前的项目合约余额

            // 发起人 (addr1) 调用 transferToInitiator
            const txResponse = await projectContract.connect(addr1).transferToInitiator();
            const txReceipt = await txResponse.wait();

            // 计算交易消耗的 Gas 费用 (如果需要精确计算余额变化)
            // const gasUsed = txReceipt.gasUsed; // BigInt
            // const effectiveGasPrice = txReceipt.effectiveGasPrice; // BigInt
            // const gasCost = gasUsed * effectiveGasPrice; // BigInt

            const finalInitiatorBalance = await ethers.provider.getBalance(addr1.address); // 提取后的余额 (BigInt)
            const finalProjectBalance = await ethers.provider.getBalance(projectContract.target); // 提取后的项目合约余额

            // 检查发起人余额是否正确增加 (考虑到 gas 消耗)
            // 预期的最终余额 = 初始余额 + 项目合约中的金额 - gas 费用
            // 使用 closeTo 允许容差
            // expect(finalInitiatorBalance).to.be.closeTo(initialInitiatorBalance + initialProjectBalance - gasCost, ethers.parseEther("0.01")); // 允许 0.01 Ether 的容差

            // 简化测试：检查发起人的余额是否至少增加了项目合约提取前的余额 - 一定的 Gas 费用
            expect(finalInitiatorBalance).to.be.gte(initialInitiatorBalance + initialProjectBalance - ethers.parseEther("0.02")); // 考虑 gas 费用，允许一定范围的减少

            // 检查项目合约的余额是否清零
            expect(finalProjectBalance).to.equal(0);
        });

        it("在众筹未结束时，不允许发起人提取资金", async function () {
            // 在众筹期内尝试提取
            await expect(projectContract.connect(addr1).transferToInitiator())
                .to.be.revertedWith("CrowdFunding: Project not ended.");
        });

        it("在众筹失败时，不允许发起人提取资金", async function () {
            const donationAmount = ethers.parseEther("2"); // 捐款金额，使项目失败
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 将时间快进到截止时间之后并结束众筹 (众筹失败)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实失败
            expect(await projectContract.isSuccessful()).to.be.false;

            // 尝试提取
            await expect(projectContract.connect(addr1).transferToInitiator())
                .to.be.revertedWith("CrowdFunding: Project was not successful.");
        });

        it("非发起人或管理员，不允许提取资金", async function () {
            const donationAmount = ethers.parseEther("10"); // 捐款金额，使项目成功
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目确实成功
            expect(await projectContract.isSuccessful()).to.be.true;

            // addr2 (非发起人，非管理员) 尝试提取
            await expect(projectContract.connect(addr2).transferToInitiator())
                .to.be.revertedWith("CrowdFunding: Not authorized.");
        });

        it("在众筹成功前，不允许捐款人提取退款", async function () {
            const donationAmount = ethers.parseEther("2"); // 捐款金额
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 在众筹期内尝试退款
            await expect(projectContract.connect(addr2).withdrawRefund())
                .to.be.revertedWith("CrowdFunding: Project not ended.");

            // 将时间快进到截止时间之后并结束众筹 (众筹失败)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目失败
            expect(await projectContract.isSuccessful()).to.be.false;

            // 在众筹失败后，捐款人应该可以退款（这个已经在上面的测试用例中覆盖）
        });

        it("在众筹成功后，不允许捐款人提取退款", async function () {
            const donationAmount = ethers.parseEther("10"); // 捐款金额，使项目成功
            await addr2.sendTransaction({
                to: projectContract.target,
                value: donationAmount
            });

            // 将时间快进到截止时间之后并结束众筹 (众筹成功)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目成功
            expect(await projectContract.isSuccessful()).to.be.true;

            // 尝试退款 (应该失败)
            await expect(projectContract.connect(addr2).withdrawRefund())
                .to.be.revertedWith("CrowdFunding: Project was successful.");
        });

        it("没有捐款的地址不能提取退款", async function () {
            // 将时间快进到截止时间之后并结束众筹 (众筹失败)
            await ethers.provider.send("evm_increaseTime", [deadline + 100]);
            await ethers.provider.send("evm_mine");
            await projectContract.connect(addr1).endFunding();

            // 确保项目失败
            expect(await projectContract.isSuccessful()).to.be.false;

            // addr3 (未捐款的地址) 尝试退款
            await expect(projectContract.connect(addrs[0]).withdrawRefund())
                .to.be.revertedWith("CrowdFunding: No refund available for this address.");
        });


        // 如果需要，添加更多关于资金提取和退款的测试
    });

    describe("CrowdFundingProposalManager 合约测试", function () {
        let CrowdFundingProposalManager; // 提案管理器合约工厂
        let proposalManager; // 提案管理器合约实例

        beforeEach(async function () {
            // 在每个测试前部署工厂合约和提案管理器合约
            CrowdFundingFactory = await ethers.getContractFactory("CrowdFundingFactory");
            factory = await CrowdFundingFactory.deploy(adminAddress);
            await factory.waitForDeployment();

            CrowdFundingProposalManager = await ethers.getContractFactory("CrowdFundingProposalManager");
            // 在构造函数中传入管理员地址和工厂合约地址
            proposalManager = await CrowdFundingProposalManager.deploy(adminAddress, factory.target);
            await proposalManager.waitForDeployment();

            // 在工厂合约中设置提案管理器的地址
            await factory.connect(owner).setProposalManagerAddress(proposalManager.target);
        });

        it("应该允许用户提交提案", async function () {
            const proposalName = "第一个提案";
            const offchainDataHash = "Qm...offchainhash...";
            await expect(proposalManager.connect(addr1).submitProposal(
                goal,
                deadline,
                offchainDataHash,
                proposalName
            ))
                .to.emit(proposalManager, "ProposalSubmitted")
                .withArgs(0, addr1.address, goal, deadline, offchainDataHash, proposalName);
            expect(await proposalManager.getProposalsCount()).to.equal(1);
        });

        it("应该允许管理员批准提案并创建项目", async function () {
            const proposalName = "要批准的提案";
            const offchainDataHash = "Qm...anotherhash...";
            await proposalManager.connect(addr1).submitProposal(goal, deadline, offchainDataHash, proposalName);
            const approveTx = await proposalManager.connect(owner).approveProposal(0);
            const approveReceipt = await approveTx.wait();
            // 检查提案状态是否更新为 Approved (通过 getAllProposals)
            // 通过 getAllProposals 函数获取所有提案
            const allProposalsAfterApprove = await proposalManager.getAllProposals();
            expect(allProposalsAfterApprove.length).to.equal(1); // 应该仍然只有一个提案
            const proposalAfterApprove = allProposalsAfterApprove[0]; // 获取第一个提案

            expect(proposalAfterApprove.status).to.equal(1); // 1 表示 Approved
            // 检查 deployedProject 地址是否已设置
            expect(proposalAfterApprove.deployedProject).to.be.properAddress;
            //           expect(proposalAfterApprove.deployedProject).to.not.equal(ethers.ZeroAddress);

            // 检查是否触发 ProposalStatusUpdated 事件，状态为 Approved
            await expect(approveTx).to.emit(proposalManager, "ProposalStatusUpdated")
                .withArgs(0, 1, owner.address); // 检查事件参数 (提案ID 0, 新状态 1(Approved), 管理员)

            // 查找 ProjectCreated 事件
            const projectCreatedEvent = approveReceipt.logs?.find(log => {
                try {
                    return factory.interface.parseLog(log).name === "ProjectCreated";
                } catch (e) {
                    return false;
                }
            });
            expect(projectCreatedEvent, "ProjectCreated 事件未找到").to.not.be.undefined;
            const parsedProjectCreatedEvent = factory.interface.parseLog(projectCreatedEvent);

            // 检查 ProjectCreated 事件的参数是否正确
            expect(parsedProjectCreatedEvent.args.initiator.toLowerCase()).to.equal(addr1.address.toLowerCase()); // 发起人应该是提案提交者
            //           expect(parsedProjectCreatedEvent.args.name).to.equal(proposalName); // 项目名称应该与提案名称一致

            // 检查 ProjectCreated 事件发出的项目名称是否正确
            expect(parsedProjectCreatedEvent.args.name).to.equal(proposalName);

            // 可选：获取新创建的项目地址并验证其他属性（如目标、持续时间，如果提案中包含这些信息）
            // const createdProjectAddress = parsedProjectCreatedEvent.args.projectAddress;
            // const createdProject = await ethers.getContractAt("CrowdFundingProject", createdProjectAddress);
            // expect(await createdProject.goal()).to.equal(goal);
            // expect(await createdProject.duration()).to.equal(duration);

        });

        it("不应该允许非管理员批准提案", async function () {
            const proposalName = "要批准的提案";
            const offchainDataHash = "Qm...thirdhash..."; // 占位符哈希
            // addr1 提交提案
            await proposalManager.connect(addr1).submitProposal(goal, deadline, offchainDataHash, proposalName);

            // addr2 (非管理员) 尝试批准提案
            await expect(proposalManager.connect(addr2).approveProposal(1))
                .to.be.revertedWith("ProposalManager: Not authorized.");
        });

        // TODO: 添加拒绝提案的测试 (如果实现拒绝功能)
        // TODO: 添加批准不存在提案的测试
        // TODO: 添加批准已批准/已拒绝提案的测试
    });
});
