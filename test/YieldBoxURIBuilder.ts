import chai, { assert, expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { WETH9Mock__factory, YieldBox, YieldBoxURIBuilder, YieldBoxURIBuilder__factory, YieldBox__factory } from "../typechain-types"
import { TokenType } from "../sdk"
chai.use(solidity)

describe("YieldBoxURIBuilder", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let uriBuilder: YieldBoxURIBuilder
    let yieldBox: YieldBox
    const sushi = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
    const rarible = "0xd07dc4262BCDbf85190C01c996b4C06a461d2430"

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address

        const weth = await new WETH9Mock__factory(deployer).deploy()
        await weth.deployed()

        uriBuilder = await new YieldBoxURIBuilder__factory(deployer).deploy()
        await uriBuilder.deployed()

        yieldBox = await new YieldBox__factory(deployer).deploy(weth.address, uriBuilder.address)
        await yieldBox.deployed()
    })

    it("Deploy YieldBoxURIBuilder", async function () {
        assert.equal((await uriBuilder.deployTransaction.wait()).status, 1)
    })

    it("Creates URI for Native tokens", async function () {
        await yieldBox.createToken("Boring Token", "BORING", 18, "")
        const asset = await yieldBox.assets(1)
        const nativeToken = await yieldBox.nativeTokens(1)

        const uri = await uriBuilder.uri(
            await yieldBox.assets(1),
            await yieldBox.nativeTokens(1),
            await yieldBox.totalSupply(1),
            await yieldBox.owner(1)
        )
        expect(uri.startsWith("data:application/json;base64,")).to.be.true
        const base64 = uri.substring(29)
        const json = Buffer.from(base64, "base64").toString("utf-8")
        const data = JSON.parse(json)
        expect(data.properties.tokenType).equals("Native")
        expect(data.name).equals("Boring Token")
        expect(data.symbol).equals("BORING")
        expect(data.decimals).equals(18)
        expect(data.properties.strategy).equals(Zero)
        expect(data.properties.totalSupply).equals(0)
        expect(data.properties.fixedSupply).equals(false)
    })

    it("Creates URI for Native token with fixed supply", async function () {
        await yieldBox.createToken("Boring Token", "BORING", 18, "")
        await yieldBox.mint(1, Alice, 1000)
        await yieldBox.transferOwnership(1, Zero, true, true)

        const uri = await uriBuilder.uri(
            await yieldBox.assets(1),
            await yieldBox.nativeTokens(1),
            await yieldBox.totalSupply(1),
            await yieldBox.owner(1)
        )
        expect(uri.startsWith("data:application/json;base64,")).to.be.true
        const base64 = uri.substring(29)
        const json = Buffer.from(base64, "base64").toString("utf-8")
        const data = JSON.parse(json)
        expect(data.properties.tokenType).equals("Native")
        expect(data.name).equals("Boring Token")
        expect(data.symbol).equals("BORING")
        expect(data.decimals).equals(18)
        expect(data.properties.strategy).equals(Zero)
        expect(data.properties.totalSupply).equals(1000)
        expect(data.properties.fixedSupply).equals(true)
    })

    it("Creates URI for ERC20 token", async function () {
        await yieldBox.registerAsset(TokenType.ERC20, sushi, Zero, 0)

        const uri = await uriBuilder.uri(
            await yieldBox.assets(1),
            await yieldBox.nativeTokens(1),
            await yieldBox.totalSupply(1),
            await yieldBox.owner(1)
        )
        expect(uri.startsWith("data:application/json;base64,")).to.be.true
        const base64 = uri.substring(29)
        const json = Buffer.from(base64, "base64").toString("utf-8")
        const data = JSON.parse(json)
        expect(data.properties.tokenType).equals("ERC20")
        expect(data.name).equals("SushiToken")
        expect(data.symbol).equals("SUSHI")
        expect(data.decimals).equals(18)
        expect(data.properties.strategy).equals(Zero)
        expect(data.properties.tokenAddress).equals(sushi.toLowerCase())
    })

    it("Creates URI for ERC1155 token", async function () {
        await yieldBox.registerAsset(TokenType.ERC1155, rarible, Zero, 50)

        const uri = await uriBuilder.uri(
            await yieldBox.assets(1),
            await yieldBox.nativeTokens(1),
            await yieldBox.totalSupply(1),
            await yieldBox.owner(1)
        )
        expect(uri.startsWith("data:application/json;base64,")).to.be.true
        const base64 = uri.substring(29)
        const json = Buffer.from(base64, "base64").toString("utf-8")
        const data = JSON.parse(json)
        expect(data.properties.tokenType).equals("ERC1155")
        expect(data.name).equals("ERC1155:0xd07dc4262bcdbf85190c01c996b4c06a461d2430/50")
        expect(data.symbol).equals("ERC1155")
        expect(data.properties.strategy).equals(Zero)
        expect(data.properties.tokenAddress).equals(rarible.toLowerCase())
        expect(data.properties.tokenId).equals(50)
    })
})
