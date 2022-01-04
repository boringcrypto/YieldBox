const { ethers, deployments, getChainId } = require("hardhat")
const { expect, assert } = require("chai")
const {
    getApprovalDigest,
    prepare,
    ADDRESS_ZERO,
    getBigNumber,
    sansSafetyAmount,
    setMasterContractApproval,
    deploy,
    deploymentsFixture,
    decodeLogs,
    advanceTime,
    weth,
    createFixture,
} = require("./utilities")

const { ecsign } = require("ethereumjs-util")
let cmd, fixture

// extreme volumes to explicitly test flashmint overflow vectors
const bigInt = require("big-integer")
const extremeValidVolume = bigInt(2).pow(127)
const bentoProtocolLimit = bigInt(2).pow(128).minus(1)
const computationalLimit = bigInt(2).pow(256).minus(1)

describe("YieldBox", function () {
    before(async function () {
        fixture = await createFixture(deployments, this, async (cmd) => {
            await cmd.deploy("weth9", "WETH9Mock")
            await cmd.deploy("yieldBox", "YieldBoxMock", this.weth9.address)

            await cmd.addToken("a", "Token A", "A", 18)
            await cmd.addToken("b", "Token B", "B", 6, "RevertingERC20Mock")
            await cmd.addToken("c", "Token C", "C", 8, "RevertingERC20Mock")

            await cmd.deploy("flashLoaner", "FlashLoanerMock")
            await cmd.deploy("sneakyFlashLoaner", "SneakyFlashLoanerMock")
            await cmd.deploy("strategy", "SimpleStrategyMock", this.yieldBox.address, this.a.address)

            await this.yieldBox.setStrategy(this.a.address, this.strategy.address)
            await advanceTime(1209600, ethers)
            await this.yieldBox.setStrategy(this.a.address, this.strategy.address)
            await this.yieldBox.setStrategyTargetPercentage(this.a.address, 20)

            await cmd.deploy("erc20", "ERC20Mock", 10000000)
            await cmd.deploy("masterContractMock", "MasterContractMock", this.yieldBox.address)

            this.a.approve = function (...params) {
                console.log(params)
                this.a.approve(...params)
            }
            await this.a.connect(this.fred).approve(this.yieldBox.address, getBigNumber(130))
            await expect(this.yieldBox.connect(this.fred).deposit(this.a.address, this.fred.address, this.fred.address, getBigNumber(100), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.fred.address, this.yieldBox.address, getBigNumber(100))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.fred.address, this.fred.address, getBigNumber(100), getBigNumber(100))

            this.yieldBox.connect(this.fred).addProfit(this.a.address, getBigNumber(30))

            await this.b.connect(this.fred).approve(this.yieldBox.address, getBigNumber(400, 6))
            await expect(this.yieldBox.connect(this.fred).deposit(this.b.address, this.fred.address, this.fred.address, getBigNumber(200, 6), 0))
                .to.emit(this.b, "Transfer")
                .withArgs(this.fred.address, this.yieldBox.address, getBigNumber(200, 6))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.b.address, this.fred.address, this.fred.address, getBigNumber(200, 6), getBigNumber(200, 6))

            this.yieldBox.connect(this.fred).addProfit(this.b.address, getBigNumber(200, 6))

            await this.yieldBox.harvest(this.a.address, true, 0)
        })
    })

    beforeEach(async function () {
        cmd = await fixture()
    })

    describe("Deploy", function () {
        it("Emits LogDeploy event with correct arguments", async function () {
            const data = "0x00"

            await expect(this.yieldBox.deploy(this.masterContractMock.address, data, true)).to.emit(this.yieldBox, "LogDeploy")
        })
    })

    describe("Conversion", function () {
        it("Should convert Shares to Amounts", async function () {
            await this.YieldBoxMock.new("bento", this.weth9.address)

            expect(await this.bento.toShare(this.a.address, 1000, false)).to.be.equal(1000)
            expect(await this.bento.toShare(this.a.address, 1, false)).to.be.equal(1)
            expect(await this.bento.toShare(this.a.address, 0, false)).to.be.equal(0)
            expect(await this.bento.toShare(this.a.address, 1000, true)).to.be.equal(1000)
            expect(await this.bento.toShare(this.a.address, 1, true)).to.be.equal(1)
            expect(await this.bento.toShare(this.a.address, 0, true)).to.be.equal(0)
            expect(await this.bento.toShare(this.a.address, extremeValidVolume.toString(), false)).to.be.equal(extremeValidVolume.toString())
            expect(await this.bento.toShare(this.a.address, bentoProtocolLimit.toString(), false)).to.be.equal(bentoProtocolLimit.toString())
            expect(await this.bento.toShare(this.a.address, computationalLimit.toString(), false)).to.be.equal(computationalLimit.toString())
            expect(await this.bento.toShare(this.a.address, extremeValidVolume.toString(), true)).to.be.equal(extremeValidVolume.toString())
            expect(await this.bento.toShare(this.a.address, bentoProtocolLimit.toString(), true)).to.be.equal(bentoProtocolLimit.toString())
            expect(await this.bento.toShare(this.a.address, computationalLimit.toString(), true)).to.be.equal(computationalLimit.toString())
        })

        it("Should convert amount to Shares", async function () {
            await this.YieldBoxMock.new("bento", this.weth9.address)

            expect(await this.bento.toAmount(this.a.address, 1000, false)).to.be.equal(1000)
            expect(await this.bento.toAmount(this.a.address, 1, false)).to.be.equal(1)
            expect(await this.bento.toAmount(this.a.address, 0, false)).to.be.equal(0)
            expect(await this.bento.toAmount(this.a.address, 1000, true)).to.be.equal(1000)
            expect(await this.bento.toAmount(this.a.address, 1, true)).to.be.equal(1)
            expect(await this.bento.toAmount(this.a.address, 0, true)).to.be.equal(0)
            expect(await this.bento.toAmount(this.a.address, extremeValidVolume.toString(), false)).to.be.equal(extremeValidVolume.toString())
            expect(await this.bento.toAmount(this.a.address, bentoProtocolLimit.toString(), false)).to.be.equal(bentoProtocolLimit.toString())
            expect(await this.bento.toAmount(this.a.address, computationalLimit.toString(), false)).to.be.equal(computationalLimit.toString())
            expect(await this.bento.toAmount(this.a.address, extremeValidVolume.toString(), true)).to.be.equal(extremeValidVolume.toString())
            expect(await this.bento.toAmount(this.a.address, bentoProtocolLimit.toString(), true)).to.be.equal(bentoProtocolLimit.toString())
            expect(await this.bento.toAmount(this.a.address, computationalLimit.toString(), true)).to.be.equal(computationalLimit.toString())
        })

        it("Should convert at ratio", async function () {
            await this.YieldBoxMock.new("bento", this.weth9.address)
            await this.a.approve(this.bento.address, getBigNumber(166))

            await this.bento.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.bento.addProfit(this.a.address, getBigNumber(66))

            expect(await this.bento.toAmount(this.a.address, 1000, false)).to.be.equal(1660)
            expect(await this.bento.toAmount(this.a.address, 1, false)).to.be.equal(1)
            expect(await this.bento.toAmount(this.a.address, 0, false)).to.be.equal(0)
            expect(await this.bento.toAmount(this.a.address, 1000, true)).to.be.equal(1660)
            expect(await this.bento.toAmount(this.a.address, 1, true)).to.be.equal(2)
            expect(await this.bento.toAmount(this.a.address, 0, true)).to.be.equal(0)
            // 1000 * 100 / 166 = 602.4096
            expect(await this.bento.toShare(this.a.address, 1000, false)).to.be.equal(602)
            expect(await this.bento.toShare(this.a.address, 1000, true)).to.be.equal(603)
            expect(await this.bento.toShare(this.a.address, 1, false)).to.be.equal(0)
            expect(await this.bento.toShare(this.a.address, 1, true)).to.be.equal(1)
            expect(await this.bento.toShare(this.a.address, 0, false)).to.be.equal(0)
            expect(await this.bento.toShare(this.a.address, 0, true)).to.be.equal(0)

            expect(await this.bento.toShare(this.a.address, extremeValidVolume.toString(), false)).to.be.equal(
                bigInt(extremeValidVolume).multiply(100).divide(166).toString()
            )
            expect(await this.bento.toShare(this.a.address, bentoProtocolLimit.toString(), false)).to.be.equal(
                bigInt(bentoProtocolLimit).multiply(100).divide(166).toString()
            )
            await expect(this.bento.toShare(this.a.address, computationalLimit.toString(), false)).to.be.revertedWith("BoringMath: Mul Overflow")
        })
    })

    describe("Extreme approvals", function () {
        it("approval succeeds with extreme but valid amount", async function () {
            await expect(this.a.approve(this.bento.address, extremeValidVolume.toString()))
                .to.emit(this.a, "Approval")
                .withArgs(this.alice.address, this.bento.address, extremeValidVolume.toString())
        })

        it("approval succeeds with bento protocol limit", async function () {
            await expect(this.a.approve(this.bento.address, bentoProtocolLimit.toString()))
                .to.emit(this.a, "Approval")
                .withArgs(this.alice.address, this.bento.address, bentoProtocolLimit.toString())
        })

        it("approval succeeds with computational limit", async function () {
            await expect(this.a.approve(this.bento.address, computationalLimit.toString()))
                .to.emit(this.a, "Approval")
                .withArgs(this.alice.address, this.bento.address, computationalLimit.toString())
        })
    })

    describe("Deposit", function () {
        it("Reverts with to address zero", async function () {
            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, ADDRESS_ZERO, 0, 0)).to.be.revertedWith(
                "YieldBox: to not set"
            )
            await expect(this.yieldBox.deposit(ADDRESS_ZERO, this.alice.address, ADDRESS_ZERO, 0, 0)).to.be.revertedWith("YieldBox: to not set")
            await expect(this.yieldBox.deposit(this.a.address, this.bob.address, ADDRESS_ZERO, 1, 0)).to.be.revertedWith(
                "YieldBox: no masterContract"
            )
        })

        it("Reverts on deposit - extreme volume at computational limit", async function () {
            await this.a.approve(this.yieldBox.address, computationalLimit.toString())
            await expect(
                this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, computationalLimit.toString(), 0)
            ).to.be.revertedWith("BoringMath: Mul Overflow")
        })

        it("Reverts on deposit - extreme volume at bento protocol limit", async function () {
            await this.a.approve(this.yieldBox.address, bentoProtocolLimit.toString())
            await expect(
                this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, bentoProtocolLimit.toString(), 0)
            ).to.be.revertedWith("BoringMath: Add Overflow")
        })

        it("Reverts on deposit - extreme volume, below bento protocol limit, but above available reserves", async function () {
            await this.a.approve(this.yieldBox.address, extremeValidVolume.toString())
            await expect(
                this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, extremeValidVolume.toString(), 0)
            ).to.be.revertedWith("BoringERC20: TransferFrom failed")
        })

        it("Reverts without approval", async function () {
            await this.a.connect(this.bob).approve(this.yieldBox.address, 1000)
            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, 100, 0)).to.be.revertedWith(
                "BoringERC20: TransferFrom failed"
            )
            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, 100, 0)).to.be.revertedWith(
                "BoringERC20: TransferFrom failed"
            )
            await expect(
                this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, bentoProtocolLimit.toString(), 0)
            ).to.be.revertedWith("BoringMath: Add Overflow")
            await expect(
                this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, computationalLimit.toString(), 0)
            ).to.be.revertedWith("BoringMath: Mul Overflow")
            await expect(this.yieldBox.connect(this.bob).deposit(this.b.address, this.bob.address, this.bob.address, 100, 0)).to.be.revertedWith(
                "BoringERC20: TransferFrom failed"
            )
            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address)).to.be.equal(0)
        })

        it("Mutates balanceOf correctly", async function () {
            await this.c.approve(this.yieldBox.address, 1000)
            await expect(this.yieldBox.deposit(this.c.address, this.alice.address, this.alice.address, 1, 0)).to.not.emit(this.c, "Transfer")
            await expect(this.yieldBox.deposit(this.c.address, this.alice.address, this.alice.address, 999, 0)).to.not.emit(this.c, "Transfer")
            await expect(this.yieldBox.deposit(this.c.address, this.alice.address, this.alice.address, 0, 1000)).to.emit(this.c, "Transfer")

            await this.a.approve(this.yieldBox.address, 1000)

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, 130, 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, "130")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, "130", "100")

            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address)).to.be.equal(100)
            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address)).to.be.equal(100)
        })

        it("Mutates balanceOf for YieldBox and WETH correctly", async function () {
            await this.weth9.connect(this.alice).deposit({ value: 1000 })
            await expect(
                this.yieldBox.connect(this.bob).deposit(ADDRESS_ZERO, this.bob.address, this.bob.address, 1, 0, { value: 1 })
            ).to.not.emit(this.weth9, "Deposit")
            await expect(this.yieldBox.connect(this.bob).deposit(ADDRESS_ZERO, this.bob.address, this.bob.address, 1000, 0, { value: 1000 }))
                .to.emit(this.weth9, "Deposit")
                .withArgs(this.yieldBox.address, "1000")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.weth9.address, this.bob.address, this.bob.address, "1000", "1000")

            expect(await this.weth9.balanceOf(this.yieldBox.address), "YieldBox should hold WETH").to.be.equal(1000)
            expect(await this.yieldBox.balanceOf(this.weth9.address, this.bob.address), "bob should have weth").to.be.equal(1000)
        })

        it("Reverts if TotalSupply of token is Zero or if token isn't a token", async function () {
            await expect(
                this.yieldBox.connect(this.bob).deposit(ADDRESS_ZERO, this.bob.address, this.bob.address, 1, 0, { value: 1 })
            ).to.be.revertedWith("YieldBox: No tokens")
            await expect(
                this.yieldBox.connect(this.bob).deposit(this.yieldBox.address, this.bob.address, this.bob.address, 1, 0, { value: 1 })
            ).to.be.revertedWith("Transaction reverted: function selector was not recognized and there's no fallback function")
        })

        it("Mutates balanceOf and totalSupply for two deposits correctly", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(1200))

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, getBigNumber(100))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), "76923076923076923076") // 100 * 1000 / 1300 = 76.923

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(200), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, getBigNumber(200))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, getBigNumber(200), "153846153846153846153")
            // 200 * 176923076923076923076 / 230000000000000000000 = 153.846153846153846153

            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address), "incorrect amount calculation").to.be.equal(
                "230769230769230769229"
            )
            // 76923076923076923076 + 153846153846153846153 = 230769230769230769229
            expect((await this.yieldBox.totals(this.a.address)).elastic, "incorrect total amount").to.be.equal(getBigNumber(430))
            // 130 + 100 + 200 = 430

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, getBigNumber(400), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, getBigNumber(400))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.bob.address, getBigNumber(400), "307692307692307692306")

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, getBigNumber(500), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, getBigNumber(500))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.bob.address, getBigNumber(500), "384615384615384615382")

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "incorrect amount calculation").to.be.equal(
                "692307692307692307688"
            )
            expect((await this.yieldBox.totals(this.a.address)).elastic, "incorrect total amount").to.be.equal(getBigNumber(1330))
        })

        it("Emits LogDeposit event with correct arguments", async function () {
            await this.a.approve(this.yieldBox.address, 100)

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, 100, 0))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.bob.address, 100, 76)
        })
    })

    describe("Deposit Share", function () {
        it("allows for deposit of Share", async function () {
            await this.a.approve(this.yieldBox.address, 2)
            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, 0, 1))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, "2")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, "2", "1")
            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address)).to.be.equal(1)
        })

        it("should not allow grieving attack with deposit of Share", async function () {
            await this.c.approve(this.yieldBox.address, 1000000000000)
            await this.yieldBox.deposit(this.c.address, this.alice.address, this.alice.address, 0, 1)
            await this.yieldBox.addProfit(this.c.address, 1)
            let amount = 2
            for (let i = 0; i < 20; i++) {
                await this.yieldBox.deposit(this.c.address, this.alice.address, this.alice.address, amount - 1, 0)
                amount += amount - 1
            }
            const ratio =
                (await this.yieldBox.totals(this.c.address)).elastic / (await this.yieldBox.balanceOf(this.c.address, this.alice.address))
            expect(ratio).to.be.lessThan(5)
        })
    })

    describe("Deposit To", function () {
        it("Mutates balanceOf and totalSupply correctly", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(100))

            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.bob.address, getBigNumber(100), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, "100000000000000000000")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.bob.address, "100000000000000000000", "76923076923076923076")

            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address), "incorrect amount calculation").to.be.equal(0)
            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "incorrect amount calculation").to.be.equal(
                "76923076923076923076"
            )

            expect((await this.yieldBox.totals(this.a.address)).elastic, "incorrect total amount").to.be.equal(getBigNumber(230))
        })
    })

    describe("Withdraw", function () {
        it("Reverts when address zero is passed as to argument", async function () {
            await expect(this.yieldBox.withdraw(this.a.address, this.alice.address, ADDRESS_ZERO, 1, 0)).to.be.revertedWith(
                "YieldBox: to not set"
            )
        })

        it("Reverts when attempting to withdraw below 1000 shares", async function () {
            await this.YieldBoxMock.new("bento", this.weth9.address)
            await this.a.approve(this.bento.address, 1000)

            await expect(this.bento.deposit(this.a.address, this.alice.address, this.alice.address, 0, 1000))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.bento.address, "1000")
                .to.emit(this.bento, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, "1000", "1000")

            await expect(this.bento.withdraw(this.a.address, this.alice.address, this.alice.address, 0, 2)).to.be.revertedWith(
                "YieldBox: cannot empty"
            )
        })

        it("Reverts when attempting to withdraw larger amount than available", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(1))

            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await expect(this.yieldBox.withdraw(this.a.address, this.alice.address, this.alice.address, getBigNumber(2), 0)).to.be.revertedWith(
                "BoringMath: Underflow"
            )
        })

        it("Reverts when attempting to withdraw an amount at computational limit (where deposit was valid)", async function () {
            await this.a.approve(this.yieldBox.address, computationalLimit.toString())
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)
            await expect(
                this.yieldBox.withdraw(this.a.address, this.alice.address, this.alice.address, computationalLimit.toString(), 0)
            ).to.be.revertedWith("BoringMath: Mul Overflow")
        })

        it("Reverts when attempting to withdraw an amount at bento protocol limit (where deposit was valid)", async function () {
            await this.a.approve(this.yieldBox.address, bentoProtocolLimit.toString())
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)
            await expect(
                this.yieldBox.withdraw(this.a.address, this.alice.address, this.alice.address, bentoProtocolLimit.toString(), 0)
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("Mutates balanceOf of Token and YieldBox correctly", async function () {
            const startBal = await this.a.balanceOf(this.alice.address)
            await this.a.approve(this.yieldBox.address, getBigNumber(130))
            await this.a.connect(this.bob).approve(this.yieldBox.address, getBigNumber(260))
            await expect(this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(130), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, "130000000000000000000")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, "130000000000000000000", "100000000000000000000")
            await expect(this.yieldBox.connect(this.bob).deposit(this.a.address, this.bob.address, this.bob.address, getBigNumber(260), 0))
                .to.emit(this.a, "Transfer")
                .withArgs(this.bob.address, this.yieldBox.address, "260000000000000000000")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.bob.address, this.bob.address, "260000000000000000000", "200000000000000000000")
            await expect(this.yieldBox.withdraw(this.a.address, this.alice.address, this.alice.address, 0, getBigNumber(100)))
                .to.emit(this.a, "Transfer")
                .withArgs(this.yieldBox.address, this.alice.address, "130000000000000000000")
                .to.emit(this.yieldBox, "LogWithdraw")
                .withArgs(this.a.address, this.alice.address, this.alice.address, "130000000000000000000", "100000000000000000000")

            expect(await this.a.balanceOf(this.alice.address), "alice should have all of their tokens back").to.equal(startBal)

            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address), "token should be withdrawn").to.equal(0)
        })

        it("Mutates balanceOf on YieldBox for WETH correctly", async function () {
            await this.weth9.connect(this.alice).deposit({
                value: 1,
            })
            await this.yieldBox.connect(this.bob).deposit(ADDRESS_ZERO, this.bob.address, this.bob.address, getBigNumber(1), 0, {
                from: this.bob.address,
                value: getBigNumber(1),
            })

            await this.yieldBox
                .connect(this.bob)
                .withdraw(ADDRESS_ZERO, this.bob.address, this.bob.address, sansSafetyAmount(getBigNumber(1)), 0, {
                    from: this.bob.address,
                })

            expect(await this.yieldBox.balanceOf(this.weth9.address, this.bob.address), "token should be withdrawn").to.be.equal(100000)
        })

        it("Reverts if ETH transfer fails", async function () {
            await this.weth9.connect(this.alice).deposit({
                value: 1,
            })
            await this.yieldBox.connect(this.bob).deposit(ADDRESS_ZERO, this.bob.address, this.bob.address, getBigNumber(1), 0, {
                from: this.bob.address,
                value: getBigNumber(1),
            })

            await expect(
                this.yieldBox
                    .connect(this.bob)
                    .withdraw(ADDRESS_ZERO, this.bob.address, this.flashLoaner.address, sansSafetyAmount(getBigNumber(1)), 0, {
                        from: this.bob.address,
                    })
            ).to.be.revertedWith("YieldBox: ETH transfer failed")
        })

        it("Emits LogWithdraw event with expected arguments", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(1))

            this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await expect(this.yieldBox.withdraw(this.a.address, this.alice.address, this.alice.address, 1, 0))
                .to.emit(this.yieldBox, "LogWithdraw")
                .withArgs(this.a.address, this.alice.address, this.alice.address, 1, 1)
        })
    })

    describe("Withdraw From", function () {
        it("Mutates yieldBox balanceOf and token balanceOf for from and to correctly", async function () {
            const bobStartBalance = await this.a.balanceOf(this.bob.address)
            await this.a.approve(this.yieldBox.address, getBigNumber(1))

            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await this.yieldBox.withdraw(this.a.address, this.alice.address, this.bob.address, 1, 0)

            expect(await this.a.balanceOf(this.bob.address), "bob should have received their tokens").to.be.equal(bobStartBalance.add(1))
        })
    })

    describe("Transfer", function () {
        it("Reverts when address zero is given as to argument", async function () {
            await expect(this.yieldBox.transfer(this.a.address, this.alice.address, ADDRESS_ZERO, 1)).to.be.revertedWith("YieldBox: to not set")
        })

        it("Reverts when attempting to transfer larger amount than available", async function () {
            await expect(this.yieldBox.connect(this.bob).transfer(this.a.address, this.bob.address, this.alice.address, 1)).to.be.revertedWith(
                "BoringMath: Underflow"
            )
        })

        it("Reverts when attempting to transfer amount below bento protocol limit but above balance", async function () {
            await expect(
                this.yieldBox.connect(this.bob).transfer(this.a.address, this.bob.address, this.alice.address, extremeValidVolume.toString())
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("Reverts when attempting to transfer bento protocol limit", async function () {
            await expect(
                this.yieldBox.connect(this.bob).transfer(this.a.address, this.bob.address, this.alice.address, bentoProtocolLimit.toString())
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("Reverts when attempting to transfer computational limit", async function () {
            await expect(
                this.yieldBox.connect(this.bob).transfer(this.a.address, this.bob.address, this.alice.address, computationalLimit.toString())
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("Mutates balanceOf for from and to correctly", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(100))
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.yieldBox.transfer(this.a.address, this.alice.address, this.bob.address, getBigNumber(50))

            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address), "token should be transferred").to.be.equal(
                "26923076923076923076"
            )
            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "token should be transferred").to.be.equal(
                "50000000000000000000"
            )
        })

        it("Emits LogTransfer event with expected arguments", async function () {
            await this.a.approve(this.yieldBox.address, 100)

            this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, 100, 0)

            await expect(this.yieldBox.transfer(this.a.address, this.alice.address, this.bob.address, 20))
                .to.emit(this.yieldBox, "LogTransfer")
                .withArgs(this.a.address, this.alice.address, this.bob.address, 20)
        })
    })

    describe("Transfer Multiple", function () {
        it("Reverts if first to argument is address zero", async function () {
            await expect(this.yieldBox.transferMultiple(this.a.address, this.alice.address, [ADDRESS_ZERO], [1])).to.be.reverted
        })

        it("should allow transfer multiple from alice to bob and carol", async function () {
            await this.a.approve(this.yieldBox.address, 200)
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, 200, 0)

            await this.yieldBox.transferMultiple(this.a.address, this.alice.address, [this.bob.address, this.carol.address], [1, 1], {
                from: this.alice.address,
            })

            expect(await this.yieldBox.balanceOf(this.a.address, this.alice.address)).to.equal(151)
            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address)).to.equal(1)
            expect(await this.yieldBox.balanceOf(this.a.address, this.carol.address)).to.equal(1)
        })

        it("revert on multiple transfer at bento protocol limit from alice to both bob and carol", async function () {
            await this.a.approve(this.yieldBox.address, bentoProtocolLimit.toString())
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await expect(
                this.yieldBox.transferMultiple(
                    this.a.address,
                    this.alice.address,
                    [this.bob.address, this.carol.address],
                    [bentoProtocolLimit.toString(), bentoProtocolLimit.toString()],
                    { from: this.alice.address }
                )
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("revert on multiple transfer at bento protocol limit from alice to bob only", async function () {
            await this.a.approve(this.yieldBox.address, bentoProtocolLimit.toString())
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await expect(
                this.yieldBox.transferMultiple(
                    this.a.address,
                    this.alice.address,
                    [this.bob.address, this.carol.address],
                    [bentoProtocolLimit.toString(), getBigNumber(1)],
                    { from: this.alice.address }
                )
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("revert on multiple transfer at computational limit from alice to both bob and carol", async function () {
            await this.a.approve(this.yieldBox.address, computationalLimit.toString())
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await expect(
                this.yieldBox.transferMultiple(
                    this.a.address,
                    this.alice.address,
                    [this.bob.address, this.carol.address],
                    [computationalLimit.toString(), computationalLimit.toString()],
                    { from: this.alice.address }
                )
            ).to.be.revertedWith("BoringMath: Add Overflow")
        })

        it("revert on multiple transfer at computational limit from alice to bob only", async function () {
            await this.a.approve(this.yieldBox.address, computationalLimit.toString())
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)

            await expect(
                this.yieldBox.transferMultiple(
                    this.a.address,
                    this.alice.address,
                    [this.bob.address, this.carol.address],
                    [computationalLimit.toString(), getBigNumber(1)],
                    { from: this.alice.address }
                )
            ).to.be.revertedWith("BoringMath: Add Overflow")
        })
    })

    describe("Skim", function () {
        it("Skims tokens to from address", async function () {
            await this.a.transfer(this.yieldBox.address, 100)

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "bob should have no tokens").to.be.equal(0)

            await expect(this.yieldBox.connect(this.bob).deposit(this.a.address, this.yieldBox.address, this.bob.address, 100, 0))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.yieldBox.address, this.bob.address, "100", "76")

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "bob should have tokens").to.be.equal(76)
        })

        it("should not allow skimming more than available", async function () {
            await this.a.transfer(this.yieldBox.address, 100)

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "bob should have no tokens").to.be.equal(0)

            await expect(
                this.yieldBox.connect(this.bob).deposit(this.a.address, this.yieldBox.address, this.bob.address, 101, 0)
            ).to.be.revertedWith("YieldBox: Skim too much")

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "bob should have no tokens").to.be.equal(0)
        })

        it("should not allow skimming at bento protocol limit", async function () {
            await this.a.transfer(this.yieldBox.address, bentoProtocolLimit.toString())

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "bob should have no tokens").to.be.equal(0)

            await expect(
                this.yieldBox
                    .connect(this.bob)
                    .deposit(this.a.address, this.yieldBox.address, this.bob.address, bigInt(bentoProtocolLimit).add(1).toString(), 0)
            ).to.be.revertedWith("YieldBox: Skim too much")

            expect(await this.yieldBox.balanceOf(this.a.address, this.bob.address), "bob should have no tokens").to.be.equal(0)
        })

        it("Emits LogDeposit event with expected arguments", async function () {
            await this.a.transfer(this.yieldBox.address, 100)

            await expect(this.yieldBox.connect(this.bob).deposit(this.a.address, this.yieldBox.address, this.bob.address, 100, 0))
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.yieldBox.address, this.bob.address, "100", "76")
        })
    })

    describe("modifier allowed", function () {
        it("does not allow functions if MasterContract does not exist", async function () {
            await this.a.approve(this.yieldBox.address, 1)

            await expect(
                this.yieldBox.connect(this.bob).deposit(this.a.address, this.alice.address, this.alice.address, 1, 0)
            ).to.be.revertedWith("YieldBox: no masterContract")
        })

        it("does not allow clone contract calls if MasterContract is not approved", async function () {
            const data = "0x00"

            let deployTx = await this.yieldBox.deploy(this.masterContractMock.address, data, true)
            const cloneAddress = (await deployTx.wait()).events[0].args.cloneAddress
            let pair = await this.masterContractMock.attach(cloneAddress)

            await this.a.approve(this.yieldBox.address, 1)

            await expect(pair.deposit(this.a.address, 1)).to.be.revertedWith("YieldBox: Transfer not approved")
        })

        it("allow clone contract calls if MasterContract is approved", async function () {
            await this.yieldBox.whitelistMasterContract(this.masterContractMock.address, true)
            await setMasterContractApproval(this.yieldBox, this.alice, this.alice, "", this.masterContractMock.address, true, true)

            const data = "0x00"

            let deployTx = await this.yieldBox.deploy(this.masterContractMock.address, data, true)
            const cloneAddress = (await deployTx.wait()).events[0].args.cloneAddress
            let pair = await this.masterContractMock.attach(cloneAddress)

            await this.a.approve(this.yieldBox.address, 2)

            await pair.deposit(this.a.address, 1)

            expect(await this.yieldBox.balanceOf(this.a.address, pair.address)).to.be.equal(1)
        })
    })

    describe("Skim ETH", function () {
        it("Skims ether to from address", async function () {
            await this.weth9.connect(this.alice).deposit({
                value: 1000,
            })

            await this.yieldBox.batch([], true, {
                value: 1000,
            })

            await this.yieldBox.deposit(ADDRESS_ZERO, this.yieldBox.address, this.alice.address, 1000, 0)

            amount = await this.yieldBox.balanceOf(this.weth9.address, this.alice.address)

            expect(amount, "alice should have weth").to.equal(1000)

            expect(await this.weth9.balanceOf(this.yieldBox.address), "YieldBox should hold WETH").to.equal(1000)
        })
    })

    describe("Batch", function () {
        it("Batches calls with revertOnFail true", async function () {
            await this.a.approve(this.yieldBox.address, 100)
            const deposit = this.yieldBox.interface.encodeFunctionData("deposit", [
                this.a.address,
                this.alice.address,
                this.alice.address,
                100,
                0,
            ])
            const transfer = this.yieldBox.interface.encodeFunctionData("transfer", [this.a.address, this.alice.address, this.bob.address, 76])
            await expect(this.yieldBox.batch([deposit, transfer], true))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alice.address, this.yieldBox.address, "100")
                .to.emit(this.yieldBox, "LogDeposit")
                .withArgs(this.a.address, this.alice.address, this.alice.address, "100", "76")
                .to.emit(this.yieldBox, "LogTransfer")
                .withArgs(this.a.address, this.alice.address, this.bob.address, "76")
            assert.equal(await this.yieldBox.balanceOf(this.a.address, this.bob.address), 76, "bob should have tokens")
        })

        it("Batches calls with revertOnFail false", async function () {
            //tested in BoringSolidity
        })

        it("Does not revert on fail if revertOnFail is set to false", async function () {
            //tested in BoringSolidity
        })

        it("Reverts on fail if revertOnFail is set to true", async function () {
            //tested in BoringSolidity
        })
    })
    describe("FlashLoan", function () {
        it("should revert on batch flashloan if not enough funds are available", async function () {
            const param = this.yieldBox.interface.encodeFunctionData("toShare", [this.a.address, 1, false])
            await expect(
                this.yieldBox.batchFlashLoan(this.flashLoaner.address, [this.flashLoaner.address], [this.a.address], [getBigNumber(1)], param)
            ).to.be.revertedWith("BoringERC20: Transfer failed")
        })

        it("should revert on flashloan if fee can not be paid", async function () {
            await this.a.transfer(this.yieldBox.address, getBigNumber(2))
            await this.a.approve(this.yieldBox.address, getBigNumber(2))
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)
            const param = this.yieldBox.interface.encodeFunctionData("toShare", [this.a.address, 1, false])
            await expect(
                this.yieldBox.batchFlashLoan(this.flashLoaner.address, [this.flashLoaner.address], [this.a.address], [getBigNumber(1)], param)
            ).to.be.revertedWith("BoringERC20: Transfer")
        })

        it("should revert on flashloan if amount is not paid back", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(2))
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)
            const param = this.yieldBox.interface.encodeFunctionData("toShare", [this.a.address, 1, false])
            await expect(
                this.yieldBox.flashLoan(this.sneakyFlashLoaner.address, this.sneakyFlashLoaner.address, this.a.address, getBigNumber(1), param)
            ).to.be.revertedWith("YieldBox: Wrong amount")
        })

        it("should revert on batch flashloan if amount is not paid back", async function () {
            await this.a.approve(this.yieldBox.address, getBigNumber(2))
            await this.yieldBox.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(1), 0)
            const param = this.yieldBox.interface.encodeFunctionData("toShare", [this.a.address, 1, false])
            await expect(
                this.yieldBox.batchFlashLoan(
                    this.sneakyFlashLoaner.address,
                    [this.sneakyFlashLoaner.address],
                    [this.a.address],
                    [getBigNumber(1)],
                    param
                )
            ).to.be.revertedWith("YieldBox: Wrong amount")
        })

        it("should allow flashloan", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            const maxLoan = (await this.a.balanceOf(this.yieldBox.address)).div(2)
            await this.yieldBox.flashLoan(this.flashLoaner.address, this.flashLoaner.address, this.a.address, maxLoan, "0x")
            expect(await this.yieldBox.toAmount(this.a.address, getBigNumber(100), false)).to.be.equal(
                getBigNumber(130).add(maxLoan.mul(5).div(10000))
            )
        })

        it("revert on request to flashloan at bento protocol limit", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            const maxLoan = bentoProtocolLimit.toString()
            await expect(
                this.yieldBox.flashLoan(this.flashLoaner.address, this.flashLoaner.address, this.a.address, maxLoan, "0x")
            ).to.be.revertedWith("BoringERC20: Transfer failed")
        })

        it("revert on request to flashloan at computational limit", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            const maxLoan = computationalLimit.toString()
            await expect(
                this.yieldBox.flashLoan(this.flashLoaner.address, this.flashLoaner.address, this.a.address, maxLoan, "0x")
            ).to.be.revertedWith("BoringMath: Mul Overflow")
        })

        it("should allow flashloan with skimable amount on YieldBox", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            await this.a.transfer(this.yieldBox.address, getBigNumber(20))
            const maxLoan = getBigNumber(130).div(2)
            await this.yieldBox.flashLoan(this.flashLoaner.address, this.flashLoaner.address, this.a.address, maxLoan, "0x")
            expect(await this.yieldBox.toAmount(this.a.address, getBigNumber(100), false)).to.be.equal(
                getBigNumber(130).add(maxLoan.mul(5).div(10000))
            )
        })

        it("should allow batch flashloan", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            const maxLoan = (await this.a.balanceOf(this.yieldBox.address)).div(2)
            await this.yieldBox.batchFlashLoan(this.flashLoaner.address, [this.flashLoaner.address], [this.a.address], [maxLoan], "0x")
            expect(await this.yieldBox.toAmount(this.a.address, getBigNumber(100), false)).to.be.equal(
                getBigNumber(130).add(maxLoan.mul(5).div(10000))
            )
        })

        it("revert on request to batch flashloan at bento protocol limit", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            const maxLoan = bentoProtocolLimit.toString()
            await expect(
                this.yieldBox.batchFlashLoan(this.flashLoaner.address, [this.flashLoaner.address], [this.a.address], [maxLoan], "0x")
            ).to.be.revertedWith("BoringERC20: Transfer failed")
        })

        it("revert on request to batch flashloan at computational limit", async function () {
            await this.a.transfer(this.flashLoaner.address, getBigNumber(2))
            const maxLoan = computationalLimit.toString()
            await expect(
                this.yieldBox.batchFlashLoan(this.flashLoaner.address, [this.flashLoaner.address], [this.a.address], [maxLoan], "0x")
            ).to.be.revertedWith("BoringMath: Mul Overflow")
        })
    })

    describe("set Strategy", function () {
        it("should allow to set strategy", async function () {
            await this.yieldBox.setStrategy(this.a.address, this.a.address)
        })

        it("should be reverted if 2 weeks are not up", async function () {
            await this.yieldBox.setStrategy(this.a.address, this.a.address)
            await expect(this.yieldBox.setStrategy(this.a.address, this.a.address)).to.be.revertedWith("StrategyManager: Too early")
        })

        it("should not allow bob to set Strategy", async function () {
            await expect(this.yieldBox.connect(this.bob).setStrategy(this.a.address, this.a.address)).to.be.reverted
        })

        it("should allow to exit strategy", async function () {
            await this.yieldBox.setStrategy(this.a.address, ADDRESS_ZERO)
            await advanceTime(1209600, ethers)
            await this.yieldBox.setStrategy(this.a.address, ADDRESS_ZERO)
        })
    })
})
