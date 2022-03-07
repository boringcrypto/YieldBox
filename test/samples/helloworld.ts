import chai, { assert, expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import {
    ERC1155TokenReceiver,
    ERC1155TokenReceiver__factory,
    ERC20Mock,
    ERC20Mock__factory,
    ERC20WithSupply__factory,
    HelloWorld,
    HelloWorld__factory,
    NativeTokenFactory__factory,
    WETH9Mock__factory,
    YieldBox,
    YieldBoxURIBuilder__factory,
    YieldBox__factory,
} from "../../typechain-types"
chai.use(solidity)

describe("Sample: Hello World", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let hello: HelloWorld
    let yieldBox: YieldBox
    let token: ERC20Mock

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address

        const weth = await new WETH9Mock__factory(deployer).deploy()
        await weth.deployed()

        const uriBuilder = await new YieldBoxURIBuilder__factory(deployer).deploy()
        await uriBuilder.deployed()

        yieldBox = await new YieldBox__factory(deployer).deploy(weth.address, uriBuilder.address)
        await yieldBox.deployed()

        token = await new ERC20Mock__factory(deployer).deploy(10000)
        await token.deployed()

        hello = await new HelloWorld__factory(deployer).deploy(yieldBox.address, token.address)
        await hello.deployed()

        await token.approve(yieldBox.address, 5000)

        await yieldBox.setApprovalForAll(hello.address, true)
    })

    it("Deploy HelloWorld", async function () {
        assert.equal((await hello.deployTransaction.wait()).status, 1)
    })

    it("deposit", async function () {
        await hello.deposit(1000)

        expect(await hello.balance()).equals(1000)
        expect(await yieldBox.balanceOf(hello.address, await hello.assetId())).equals(100000000000)
    })

    it("withdraw", async function () {
        expect(await token.balanceOf(Deployer)).equals(10000)

        await hello.deposit(1000)
        await hello.withdraw()

        expect(await token.balanceOf(Deployer)).equals(10000)
    })

    it("multiple deposits and withdraw", async function () {
        await hello.deposit(1000)
        await hello.deposit(1000)
        await hello.deposit(1000)
        await hello.deposit(1000)
        await hello.deposit(1000)

        expect(await hello.balance()).equals(5000)
        expect(await yieldBox.balanceOf(hello.address, await hello.assetId())).equals(500000000000)

        await hello.withdraw()

        expect(await hello.balance()).equals(0)
        expect(await yieldBox.balanceOf(hello.address, await hello.assetId())).equals(0)
    })
})
