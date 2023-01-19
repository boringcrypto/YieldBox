import chai, { expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import {
    ERC1155Mock,
    ERC1155Mock__factory,
    ERC1155StrategyMock,
    ERC1155StrategyMock__factory,
    ERC20Mock,
    ERC20Mock__factory,
    ERC20StrategyMock,
    ERC20StrategyMock__factory,
    MasterContractFullCycleMock__factory,
    MasterContractMock__factory,
    WETH9Mock,
    WETH9Mock__factory,
    YieldBox,
    YieldBoxURIBuilder,
    YieldBoxURIBuilder__factory,
    YieldBox__factory,
} from "../typechain-types"
import { TokenType } from "../sdk"
chai.use(solidity)

describe("YieldBox", function () {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let weth: WETH9Mock
    let yieldBox: YieldBox
    let uriBuilder: YieldBoxURIBuilder
    let token: ERC20Mock
    let erc1155: ERC1155Mock
    let tokenStrategy: ERC20StrategyMock
    let erc1155Strategy: ERC1155StrategyMock
    let ethStrategy: ERC20StrategyMock

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address

        weth = await new WETH9Mock__factory(deployer).deploy()
        await weth.deployed()

        uriBuilder = await new YieldBoxURIBuilder__factory(deployer).deploy()
        await uriBuilder.deployed()

        yieldBox = await new YieldBox__factory(deployer).deploy(weth.address, uriBuilder.address)
        await yieldBox.deployed()

        // Native token
        await yieldBox.createToken("Boring Token", "BORING", 18, "")
        await yieldBox.mint(1, Deployer, 10000)

        // ERC20 token
        token = await new ERC20Mock__factory(deployer).deploy(10000)
        await token.deployed()
        token.approve(yieldBox.address, 10000)

        // ERC1155 token
        erc1155 = await new ERC1155Mock__factory(deployer).deploy()
        await erc1155.deployed()
        await erc1155.mint(Deployer, 42, 10000)
        await erc1155.setApprovalForAll(yieldBox.address, true)

        // Strategies
        tokenStrategy = await new ERC20StrategyMock__factory(deployer).deploy(yieldBox.address, token.address)
        await tokenStrategy.deployed()

        erc1155Strategy = await new ERC1155StrategyMock__factory(deployer).deploy(yieldBox.address, erc1155.address, 42)
        await erc1155Strategy.deployed()

        ethStrategy = await new ERC20StrategyMock__factory(deployer).deploy(yieldBox.address, weth.address)
        await ethStrategy.deployed()
    })

    it("Deploy YieldBox", async function () {
        expect((await yieldBox.deployTransaction.wait()).status).equals(1)

        expect(await yieldBox.wrappedNative()).equals(weth.address)
        expect(await yieldBox.uriBuilder()).equals(uriBuilder.address)
    })

    describe("toShare and toAmount", () => {
        it("works", async function () {
            expect(await yieldBox.toShare(1, 123, false)).equals(123)
            expect(await yieldBox.toAmount(1, 123, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 1)).equals(10000)

            await yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 1000, 0)
            expect(await yieldBox.toShare(2, 123, false)).equals(123_00000000)
            expect(await yieldBox.toAmount(2, 123_00000000, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 2)).equals(1000)

            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 1000, 0)
            expect(await yieldBox.toShare(3, 123, false)).equals(123_00000000)
            expect(await yieldBox.toAmount(3, 123_00000000, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 3)).equals(1000)

            await yieldBox.depositETH(Zero, Deployer, 1000, { value: 1000 })
            expect(await yieldBox.toShare(4, 123, false)).equals(123_00000000)
            expect(await yieldBox.toAmount(4, 123_00000000, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 4)).equals(1000)

            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 1000, 0)
            expect(await yieldBox.toShare(5, 123, false)).equals(123_00000000)
            expect(await yieldBox.toAmount(5, 123_00000000, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 5)).equals(1000)

            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 1000, 0)
            expect(await yieldBox.toShare(6, 123, false)).equals(123_00000000)
            expect(await yieldBox.toAmount(6, 123_00000000, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 6)).equals(1000)

            await yieldBox.depositETH(ethStrategy.address, Deployer, 1000, { value: 1000 })
            expect(await yieldBox.toShare(7, 123, false)).equals(123_00000000)
            expect(await yieldBox.toAmount(7, 123_00000000, false)).equals(123)
            expect(await yieldBox.amountOf(Deployer, 7)).equals(1000)
        })
    })

    describe("deposit", () => {
        it("handles deposit of ERC20 token", async function () {
            // deposit by amount
            await expect(yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Alice, 1000, 0))
                .to.emit(yieldBox, "AssetRegistered")
                .withArgs(TokenType.ERC20, token.address, Zero, 0, 2)
                .to.emit(token, "Transfer")
                .withArgs(Deployer, yieldBox.address, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
            // deposit by share
            await expect(yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Alice, 0, 1000_00000000))
                .to.emit(token, "Transfer")
                .withArgs(Deployer, yieldBox.address, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
                .to.not.emit(yieldBox, "AssetRegistered")

            expect(await yieldBox.balanceOf(Alice, 2)).equals(2000_00000000)
            expect(await token.balanceOf(yieldBox.address)).equals(2000)
        })

        it("handles deposit of ERC1155 token (Native)", async function () {
            // deposit by amount
            await expect(yieldBox.deposit(TokenType.ERC1155, yieldBox.address, Zero, 1, Deployer, Alice, 1000, 0))
                .to.emit(yieldBox, "AssetRegistered")
                .withArgs(TokenType.ERC1155, yieldBox.address, Zero, 1, 2)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, yieldBox.address, 1, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
            // deposit by share
            await expect(yieldBox.deposit(TokenType.ERC1155, yieldBox.address, Zero, 1, Deployer, Alice, 0, 1000_00000000))
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, yieldBox.address, 1, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
                .to.not.emit(yieldBox, "AssetRegistered")

            expect(await yieldBox.balanceOf(Alice, 2)).equals(2000_00000000)
        })

        it("handles deposit of ERC1155 token (Native lazy way)", async function () {
            // deposit by amount
            await expect(yieldBox.deposit(TokenType.Native, Zero, Zero, 1, Deployer, Alice, 1000, 0))
                .to.emit(yieldBox, "AssetRegistered")
                .withArgs(TokenType.ERC1155, yieldBox.address, Zero, 1, 2)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, yieldBox.address, 1, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
            // deposit by share
            await expect(yieldBox.deposit(TokenType.Native, Zero, Zero, 1, Deployer, Alice, 0, 1000_00000000))
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, yieldBox.address, 1, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
                .to.not.emit(yieldBox, "AssetRegistered")

            expect(await yieldBox.balanceOf(Alice, 2)).equals(2000_00000000)
        })

        it("handles deposit of ERC1155 token (External)", async function () {
            // deposit by amount
            await expect(yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Alice, 1000, 0))
                .to.emit(yieldBox, "AssetRegistered")
                .withArgs(TokenType.ERC1155, erc1155.address, Zero, 42, 2)
                .to.emit(erc1155, "TransferSingle")
                .withArgs(yieldBox.address, Deployer, yieldBox.address, 42, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
            // deposit by share
            await expect(yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Alice, 0, 1000_00000000))
                .to.emit(erc1155, "TransferSingle")
                .withArgs(yieldBox.address, Deployer, yieldBox.address, 42, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Zero, Alice, 2, 1000_00000000)
                .to.not.emit(yieldBox, "AssetRegistered")

            expect(await yieldBox.balanceOf(Alice, 2)).equals(2000_00000000)
        })

        it("reverts on trying to deposit of Native asset", async function () {
            // deposit by amount
            await expect(yieldBox.depositAsset(1, Deployer, Alice, 1000, 0)).to.be.revertedWith("can't deposit Native")
            // deposit by share
            await expect(yieldBox.depositAsset(1, Deployer, Alice, 0, 1000_00000000)).to.be.revertedWith("can't deposit Native")

            expect(await yieldBox.balanceOf(Alice, 1)).equals(0)
        })

        it("reverts on trying to deposit assets that aren't yours", async function () {
            // deposit by amount
            await expect(yieldBox.connect(alice).depositAsset(1, Deployer, Alice, 1000, 0)).to.be.revertedWith("YieldBox: Not approved")
            // deposit by share
            await expect(yieldBox.connect(alice).depositAsset(1, Deployer, Alice, 0, 1000_00000000)).to.be.revertedWith("YieldBox: Not approved")

            expect(await yieldBox.balanceOf(Alice, 1)).equals(0)
        })
    })

    describe("deposit with strategy", () => {
        it("handles deposit of ERC20 token", async function () {
            // deposit by amount
            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Alice, 1000, 0)
            // deposit by share
            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Alice, 0, 1000_00000000)

            expect(await yieldBox.balanceOf(Alice, 2)).equals(2000_00000000)
            expect(await yieldBox.toAmount(2, 2000_00000000, false)).equals(2000)

            expect(await token.balanceOf(yieldBox.address)).equals(0)
            expect(await token.balanceOf(tokenStrategy.address)).equals(2000)
        })

        it("handles deposit of ERC1155 token (Native)", async function () {
            const strategy = await new ERC1155StrategyMock__factory(deployer).deploy(yieldBox.address, yieldBox.address, 1)
            await strategy.deployed()
            // deposit by amount
            await yieldBox.deposit(TokenType.ERC1155, yieldBox.address, strategy.address, 1, Deployer, Alice, 1000, 0)
            // deposit by share
            await yieldBox.deposit(TokenType.ERC1155, yieldBox.address, strategy.address, 1, Deployer, Alice, 0, 1000_00000000)

            expect(await yieldBox.balanceOf(Alice, 2)).equals(2000_00000000)
        })
    })

    describe("depositETH", () => {
        it("handles deposit of ETH", async function () {
            // deposit by amount only
            await yieldBox.depositETH(Zero, Alice, 1000, {
                value: 1000,
            })

            expect(await yieldBox.balanceOf(Alice, 2)).equals(1000_00000000)
            expect(await weth.balanceOf(yieldBox.address)).equals(1000)
        })

        it("reverts on deposit with too little ETH", async function () {
            // deposit by amount only
            await expect(yieldBox.depositETH(Zero, Alice, 1000, { value: 999 })).to.be.revertedWith("function call failed to execute")
        })

        it("reverts on deposit of not ETH", async function () {
            // deposit by amount only
            await expect(yieldBox.depositETHAsset(1, Alice, 1000, { value: 1000 })).to.be.revertedWith("YieldBox: not wrappedNative")
        })
    })

    describe("depositETH with strategy", () => {
        it("handles deposit of ETH", async function () {
            // deposit by amount only
            await yieldBox.depositETH(ethStrategy.address, Alice, 1000, {
                value: 1000,
            })

            expect(await yieldBox.balanceOf(Alice, 2)).equals(1000_00000000)
            expect(await weth.balanceOf(yieldBox.address)).equals(0)
            expect(await weth.balanceOf(ethStrategy.address)).equals(1000)
        })

        it("reverts on deposit with too little ETH", async function () {
            // deposit by amount only
            await expect(yieldBox.depositETH(Zero, Alice, 1000, { value: 999 })).to.be.revertedWith("function call failed to execute")
        })
    })

    describe("transfer", () => {
        it("can transfer", async function () {
            await expect(yieldBox.connect(deployer).transfer(Deployer, Alice, 1, 1000))
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, Alice, 1, 1000)

            expect(await yieldBox.balanceOf(Deployer, 1)).equals(9000)
            expect(await yieldBox.balanceOf(Alice, 1)).equals(1000)
        })
    })

    describe("safeTransfer", () => {
        it("can safeTransfer", async function () {
            await expect(yieldBox.connect(deployer).safeTransferFrom(Deployer, Alice, 1, 1000, "0x"))
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, Alice, 1, 1000)

            expect(await yieldBox.balanceOf(Deployer, 1)).equals(9000)
            expect(await yieldBox.balanceOf(Alice, 1)).equals(1000)
        })
    })

    describe("batchTransfer", () => {
        it("can transfer", async function () {
            await yieldBox.createToken("Test", "TEST", 0, "")
            await yieldBox.createToken("Another", "ANY", 12, "")
            await yieldBox.mint(2, Deployer, 5000)
            await yieldBox.mint(3, Deployer, 3000)
            await expect(yieldBox.connect(deployer).batchTransfer(Deployer, Alice, [1, 3, 2], [1000, 1200, 500]))
                .to.emit(yieldBox, "TransferBatch")
                .withArgs(Deployer, Deployer, Alice, [1, 3, 2], [1000, 1200, 500])

            expect(await yieldBox.balanceOf(Deployer, 1)).equals(9000)
            expect(await yieldBox.balanceOf(Deployer, 2)).equals(4500)
            expect(await yieldBox.balanceOf(Deployer, 3)).equals(1800)
            expect(await yieldBox.balanceOf(Alice, 1)).equals(1000)
            expect(await yieldBox.balanceOf(Alice, 2)).equals(500)
            expect(await yieldBox.balanceOf(Alice, 3)).equals(1200)
        })
    })

    describe("safeBatchTransfer", () => {
        it("can transfer", async function () {
            await yieldBox.createToken("Test", "TEST", 0, "")
            await yieldBox.createToken("Another", "ANY", 12, "")
            await yieldBox.mint(2, Deployer, 5000)
            await yieldBox.mint(3, Deployer, 3000)
            await expect(yieldBox.connect(deployer).safeBatchTransferFrom(Deployer, Alice, [1, 3, 2], [1000, 1200, 500], "0x"))
                .to.emit(yieldBox, "TransferBatch")
                .withArgs(Deployer, Deployer, Alice, [1, 3, 2], [1000, 1200, 500])

            expect(await yieldBox.balanceOf(Deployer, 1)).equals(9000)
            expect(await yieldBox.balanceOf(Deployer, 2)).equals(4500)
            expect(await yieldBox.balanceOf(Deployer, 3)).equals(1800)
            expect(await yieldBox.balanceOf(Alice, 1)).equals(1000)
            expect(await yieldBox.balanceOf(Alice, 2)).equals(500)
            expect(await yieldBox.balanceOf(Alice, 3)).equals(1200)
        })
    })

    describe("transferMultiple", () => {
        it("can transfer", async function () {
            await expect(yieldBox.connect(deployer).transferMultiple(Deployer, [Alice, Bob, Carol], 1, [1000, 3000, 500]))
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, Alice, 1, 1000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, Bob, 1, 3000)
                .to.emit(yieldBox, "TransferSingle")
                .withArgs(Deployer, Deployer, Carol, 1, 500)

            expect(await yieldBox.balanceOf(Deployer, 1)).equals(5500)
            expect(await yieldBox.balanceOf(Alice, 1)).equals(1000)
            expect(await yieldBox.balanceOf(Bob, 1)).equals(3000)
            expect(await yieldBox.balanceOf(Carol, 1)).equals(500)
        })

        it("can's transfer to zero", async function () {
            await expect(yieldBox.connect(deployer).transferMultiple(Deployer, [Alice, Bob, Zero], 1, [1000, 3000, 500])).to.be.revertedWith(
                "YieldBox: to not set"
            )
        })
    })

    describe("withdraw", () => {
        it("can withdraw ERC20", async function () {
            await yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(2, Deployer, Deployer, 0, 1000_00000000)
        })

        it("can withdraw ERC1155", async function () {
            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(2, Deployer, Deployer, 0, 1000_00000000)
        })

        it("can withdraw ETH", async function () {
            await yieldBox.depositETH(Zero, Deployer, 1000, { value: 1000 })
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
        })

        it("can withdraw ERC20 with strategy", async function () {
            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(2, Deployer, Deployer, 0, 1000_00000000)
        })

        it("can withdraw ERC1155 with strategy", async function () {
            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(2, Deployer, Deployer, 0, 1000_00000000)
        })

        it("can withdraw ETH with strategy", async function () {
            await yieldBox.depositETH(ethStrategy.address, Deployer, 1000, { value: 1000 })
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
        })

        it("cannot withdraw Native", async function () {
            await expect(yieldBox.withdraw(1, Deployer, Deployer, 1000, 0)).to.be.revertedWith("YieldBox: can't withdraw Native")
        })
    })

    describe("full cycle", () => {
        it("runs full cycle as msg.sender", async function () {
            await yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(2, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(2, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(3, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(3, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.depositETH(Zero, Deployer, 1000, { value: 1000 })
            await yieldBox.withdraw(4, Deployer, Deployer, 1000, 0)

            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(5, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(5, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 1000, 0)
            await yieldBox.deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.withdraw(6, Deployer, Deployer, 1000, 0)
            await yieldBox.withdraw(6, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.depositETH(ethStrategy.address, Deployer, 1000, { value: 1000 })
            await yieldBox.withdraw(7, Deployer, Deployer, 1000, 0)
        })

        it("runs full cycle as approvedForAll", async function () {
            await yieldBox.setApprovalForAll(Alice, true)
            await yieldBox.connect(alice).deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).deposit(TokenType.ERC20, token.address, Zero, 0, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.connect(alice).withdraw(2, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).withdraw(2, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.connect(alice).deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).deposit(TokenType.ERC1155, erc1155.address, Zero, 42, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.connect(alice).withdraw(3, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).withdraw(3, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.connect(alice).depositETH(Zero, Deployer, 1000, { value: 1000 })
            await yieldBox.connect(alice).withdraw(4, Deployer, Deployer, 1000, 0)

            await yieldBox.connect(alice).deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).deposit(TokenType.ERC20, token.address, tokenStrategy.address, 0, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.connect(alice).withdraw(5, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).withdraw(5, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.connect(alice).deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 1000, 0)
            await yieldBox
                .connect(alice)
                .deposit(TokenType.ERC1155, erc1155.address, erc1155Strategy.address, 42, Deployer, Deployer, 0, 1000_00000000)
            await yieldBox.connect(alice).withdraw(6, Deployer, Deployer, 1000, 0)
            await yieldBox.connect(alice).withdraw(6, Deployer, Deployer, 0, 1000_00000000)

            await yieldBox.connect(alice).depositETH(ethStrategy.address, Deployer, 1000, { value: 1000 })
            await yieldBox.connect(alice).withdraw(7, Deployer, Deployer, 1000, 0)
        })

        it("runs full cycle as masterContract", async function () {
            const master = await new MasterContractFullCycleMock__factory(deployer).deploy(yieldBox.address)
            await master.deployed()
            await master.init(
                new ethers.utils.AbiCoder().encode(
                    ["address", "address", "address", "address", "address", "address"],
                    [Deployer, token.address, erc1155.address, tokenStrategy.address, erc1155Strategy.address, ethStrategy.address]
                )
            )

            await yieldBox.setApprovalForAll(master.address, true)
            await master.run({ value: 2000 })
        })
    })

    describe("uri", () => {
        it("returns the uri from the uriBuilder", async function () {
            const uri = await uriBuilder.uri(
                await yieldBox.assets(1),
                await yieldBox.nativeTokens(1),
                await yieldBox.totalSupply(1),
                await yieldBox.owner(1)
            )

            expect(await yieldBox.uri(1)).equals(uri)
        })
    })

    describe("setApprovalForAll", () => {
        it("reverts when operator is 0", async function () {
            await expect(yieldBox.setApprovalForAll(Zero, true)).to.be.revertedWith("YieldBox: operator not set")
        })
    })
})
