const { ADDRESS_ZERO, setMasterContractApproval, createFixture, getBigNumber, advanceTime } = require("./utilities")
const { expect } = require("chai")
const { ethers } = require("hardhat")

let cmd, fixture

describe("MoneySink", function () {
    before(async function () {
        fixture = await createFixture(deployments, this, async (cmd) => {
            await cmd.deploy("sushi", "RevertingERC20Mock", "SUSHI", "SUSHI", 18, getBigNumber("10000000"))
            await cmd.deploy("weth9", "WETH9Mock")
            await cmd.deploy("yieldBox", "YieldBoxMock", this.weth9.address)
            await cmd.deploy("moneySink", "MoneySink", this.yieldBox.address, this.sushi.address)
            await this.moneySink.transferOwnership(this.yieldBox.address, true, false)
        })
        cmd = await fixture()
    })

    it("allows to set strategy", async function () {
        await this.yieldBox.setStrategy(this.sushi.address, this.moneySink.address)
        expect(await this.yieldBox.pendingStrategy(this.sushi.address)).to.be.equal(this.moneySink.address)
        await advanceTime(1209600, ethers)
        await this.yieldBox.setStrategy(this.sushi.address, this.moneySink.address)
        expect(await this.yieldBox.strategy(this.sushi.address)).to.be.equal(this.moneySink.address)
    })

    it("allows to set target for Sushi", async function () {
        await this.yieldBox.setStrategyTargetPercentage(this.sushi.address, 80)
        expect((await this.yieldBox.strategyData(this.sushi.address)).targetPercentage).to.be.equal(80)
    })

    it("should rebalance the token", async function () {
        await this.sushi.approve(this.yieldBox.address, getBigNumber(10))
        await this.yieldBox.deposit(this.sushi.address, this.alice.address, this.alice.address, getBigNumber(10), 0)
        expect((await this.yieldBox.strategyData(this.sushi.address)).balance).to.be.equal(0)
        await expect(this.yieldBox.harvest(this.sushi.address, true, getBigNumber(1)))
            .to.emit(this.yieldBox, "LogStrategyInvest")
            .withArgs(this.sushi.address, getBigNumber(1))
        await expect(this.yieldBox.harvest(this.sushi.address, true, getBigNumber(3)))
            .to.emit(this.yieldBox, "LogStrategyInvest")
            .withArgs(this.sushi.address, getBigNumber(3))
        await expect(this.yieldBox.harvest(this.sushi.address, true, getBigNumber(4)))
            .to.emit(this.yieldBox, "LogStrategyInvest")
            .withArgs(this.sushi.address, getBigNumber(4))
        expect((await this.yieldBox.strategyData(this.sushi.address)).balance).to.be.equal(getBigNumber(8))
    })

    it("tracks loss from harvest correctly", async function () {
        await this.moneySink.lose(getBigNumber(1))
        expect((await this.yieldBox.totals(this.sushi.address)).elastic).to.equal("10000000000000000000")
        await expect(this.yieldBox.harvest(this.sushi.address, false, 0))
            .to.emit(this.yieldBox, "LogStrategyLoss")
            .withArgs(this.sushi.address, getBigNumber(1))
        expect((await this.yieldBox.totals(this.sushi.address)).elastic).to.equal(getBigNumber(9))
    })

    it("switches to new strategy and exits from old", async function () {
        await cmd.deploy("moneySink2", "MoneySink", this.yieldBox.address, this.sushi.address)
        await this.yieldBox.setStrategy(this.sushi.address, this.moneySink2.address)
        await advanceTime(1209600, ethers)
        await this.yieldBox.setStrategy(this.sushi.address, this.moneySink2.address)
        expect(await this.sushi.balanceOf(this.yieldBox.address)).to.be.equal(getBigNumber(9))
        expect((await this.yieldBox.totals(this.sushi.address)).elastic).to.be.equal(getBigNumber(9))
    })

    it("holds correct asset after withdraw and harvest from YieldBox", async function () {
        await this.moneySink2.transferOwnership(this.yieldBox.address, true, false)
        expect((await this.yieldBox.strategyData(this.sushi.address)).balance).to.be.equal(0)
        await this.yieldBox.harvest(this.sushi.address, true, 0)
        await this.yieldBox.withdraw(this.sushi.address, this.alice.address, this.alice.address, getBigNumber(1, 17), 0)
        expect((await this.yieldBox.strategyData(this.sushi.address)).balance).to.be.equal(getBigNumber(720, 16))
        await this.moneySink2.lose(getBigNumber(3))
        await this.yieldBox.harvest(this.sushi.address, false, 0)
        expect(await this.sushi.balanceOf(this.yieldBox.address)).to.be.equal(getBigNumber(170, 16))
        expect((await this.yieldBox.strategyData(this.sushi.address)).balance).to.be.equal(getBigNumber(420, 16))
        expect((await this.yieldBox.totals(this.sushi.address)).elastic).to.be.equal(getBigNumber(590, 16))
    })
})
