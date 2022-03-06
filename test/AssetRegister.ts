import chai, { assert, expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { AssetRegister, AssetRegister__factory, SushiStakingStrategy, SushiStakingStrategy__factory } from "../typechain-types"
chai.use(solidity)

describe("AssetRegister", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let register: AssetRegister
    let sushiStrategy: SushiStakingStrategy
    enum TokenType {
        Native = 0,
        ERC20 = 1,
        ERC1155 = 2,
    }
    const sushi = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
    const rarible = "0xd07dc4262BCDbf85190C01c996b4C06a461d2430"

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address
        register = await new AssetRegister__factory(deployer).deploy()
        await register.deployed()

        sushiStrategy = await new SushiStakingStrategy__factory(deployer).deploy()
        await sushiStrategy.deployed()
    })

    it("Deploy ERC1155TokenReceiver", async function () {
        assert.equal((await register.deployTransaction.wait()).status, 1)
    })

    it("can register an asset", async function () {
        await expect(register.registerAsset(TokenType.ERC20, sushi, Zero, 0)).to.emit(register, "URI").withArgs("", 1)
        await expect(register.registerAsset(TokenType.ERC1155, rarible, Zero, 628973)).to.emit(register, "URI").withArgs("", 2)
        await expect(register.registerAsset(TokenType.ERC20, sushi, Zero, 0)).to.not.emit(register, "URI")
        await expect(register.registerAsset(TokenType.ERC1155, rarible, Zero, 628973)).to.not.emit(register, "URI")

        await expect(register.registerAsset(TokenType.ERC20, sushi, sushiStrategy.address, 0)).to.emit(register, "URI").withArgs("", 3)
    })

    it("cannot register a Native asset", async function () {
        await expect(register.registerAsset(TokenType.Native, Zero, Zero, 0)).to.be.revertedWith("AssetManager: cannot add Native")
    })

    it("cannot add an ERC20 token with a tokenId", async function () {
        await expect(register.registerAsset(TokenType.ERC20, sushi, sushiStrategy.address, 1)).to.be.revertedWith("No tokenId for ERC20")
    })

    it("cannot register an asset with a mismatching strategy", async function () {
        await expect(register.registerAsset(TokenType.ERC1155, rarible, sushiStrategy.address, 628973)).to.be.revertedWith("Strategy mismatch")
    })

    it("cannot use an EOA as contractAddress", async function () {
        await expect(register.registerAsset(TokenType.ERC20, Alice, Zero, 0)).to.be.revertedWith("Not a token")
        await expect(register.registerAsset(TokenType.ERC1155, Bob, Zero, 0)).to.be.revertedWith("Not a token")
        await expect(register.registerAsset(TokenType.ERC20, Zero, Zero, 0)).to.be.revertedWith("Not a token")
    })
})
