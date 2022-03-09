import chai, { assert, expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { NativeTokenFactory, NativeTokenFactory__factory } from "../typechain-types"
chai.use(solidity)

describe("NativeTokenFactory", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let factory: NativeTokenFactory
    enum TokenType {
        Native = 0,
        ERC20 = 1,
        ERC1155 = 2,
    }

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address
        factory = await new NativeTokenFactory__factory(deployer).deploy()
        await factory.deployed()
        await factory.createToken("Boring Token", "BORING", 18)
    })

    it("Deploy NativeTokenFactory", async function () {
        assert.equal((await factory.deployTransaction.wait()).status, 1)
    })

    it("can create a token", async function () {
        await expect(factory.createToken("Test Token", "TEST", 12))
            .to.emit(factory, "URI")
            .withArgs("", 2)
            .to.emit(factory, "AssetRegistered")
            .withArgs(TokenType.Native, Zero, Zero, 2, 2)
            .to.emit(factory, "TokenCreated")
            .withArgs(Deployer, "Test Token", "TEST", 12, 2)

        expect(await factory.owner(2)).equals(Deployer)

        const asset = await factory.assets(2)
        expect(asset.tokenType).equals(TokenType.Native)
        expect(asset.contractAddress).equals(Zero)
        expect(asset.strategy).equals(Zero)
        expect(asset.tokenId).equals(2)

        const token = await factory.nativeTokens(2)
        expect(token.name).equals("Test Token")
        expect(token.symbol).equals("TEST")
        expect(token.decimals).equals(12)
    })

    describe("Mint", function () {
        it("Prevents non-owners from minting", async function () {
            await expect(factory.connect(alice).mint(1, Deployer, 0)).to.be.revertedWith("NTF: caller is not the owner")
            await expect(factory.connect(alice).mint(1, Deployer, 1000)).to.be.revertedWith("NTF: caller is not the owner")
            await expect(factory.connect(alice).mint(1, Alice, 1000)).to.be.revertedWith("NTF: caller is not the owner")
            await expect(factory.connect(alice).mint(1, Bob, 1000)).to.be.revertedWith("NTF: caller is not the owner")
        })

        it("Can mint", async function () {
            await expect(factory.mint(1, Deployer, 500)).to.emit(factory, "TransferSingle").withArgs(Deployer, Zero, Deployer, 1, 500)
            await expect(factory.mint(1, Alice, 250)).to.emit(factory, "TransferSingle").withArgs(Deployer, Zero, Alice, 1, 250)

            expect(await factory.balanceOf(Deployer, 1)).to.equal(500)
            expect(await factory.balanceOf(Alice, 1)).to.equal(250)
            expect(await factory.totalSupply(1)).to.equal(750)
        })
    })

    describe("Burn", function () {
        it("Prevents burning without tokens", async function () {
            await factory.mint(1, Alice, 500)
            await expect(factory.burn(1, Deployer, 100)).to.be.revertedWith("panic code 0x11")
        })

        it("Can burn", async function () {
            await factory.mint(1, Deployer, 500)
            await factory.mint(1, Alice, 250)

            await expect(factory.burn(1, Deployer, 500)).to.emit(factory, "TransferSingle").withArgs(Deployer, Deployer, Zero, 1, 500)
            await expect(factory.connect(alice).burn(1, Alice, 50)).to.emit(factory, "TransferSingle").withArgs(Alice, Alice, Zero, 1, 50)

            expect(await factory.balanceOf(Deployer, 1)).to.equal(0)
            expect(await factory.balanceOf(Alice, 1)).to.equal(200)
            expect(await factory.totalSupply(1)).to.equal(200)
        })
    })

    describe("Renounce Ownership", function () {
        it("Prevents non-owners from renouncement", async function () {
            await expect(factory.connect(bob).transferOwnership(1, Zero, true, true)).to.be.revertedWith("NTF: caller is not the owner")
        })

        it("Assigns owner to address zero", async function () {
            expect(await factory.owner(1)).equals(Deployer)

            await expect(factory.transferOwnership(1, Zero, true, true)).to.emit(factory, "OwnershipTransferred").withArgs(1, Deployer, Zero)

            expect(await factory.owner(1)).to.equal(Zero)
        })
    })

    describe("Transfer Ownership", function () {
        it("Prevents non-owners from transferring", async function () {
            await expect(factory.connect(bob).transferOwnership(1, Alice, false, false)).to.be.revertedWith("NTF: caller is not the owner")
        })

        it("Changes pending owner after transfer", async function () {
            await factory.transferOwnership(1, Alice, false, false)

            expect(await factory.pendingOwner(1)).to.equal(Alice)
        })
    })

    describe("Transfer Ownership Direct", function () {
        it("Reverts given a zero address as newOwner argument", async function () {
            await expect(factory.transferOwnership(1, Zero, true, false)).to.be.revertedWith("NTF: zero address")
        })

        it("Mutates owner", async function () {
            await factory.transferOwnership(1, Alice, true, false)

            expect(await factory.owner(1)).to.equal(Alice)
        })

        it("Emit OwnershipTransferred event with expected arguments", async function () {
            await expect(factory.transferOwnership(1, Alice, true, false)).to.emit(factory, "OwnershipTransferred").withArgs(1, Deployer, Alice)
        })
    })

    describe("Claim Ownership", function () {
        it("Mutates owner", async function () {
            await factory.transferOwnership(1, Alice, false, false)
            await factory.connect(alice).claimOwnership(1)

            expect(await factory.owner(1)).to.equal(Alice)
        })

        it("Assigns previous owner to address zero", async function () {
            await factory.transferOwnership(1, Alice, false, false)
            await factory.connect(alice).claimOwnership(1)

            expect(await factory.pendingOwner(1)).to.equal(Zero)
        })

        it("Prevents anybody but pending owner from claiming ownership", async function () {
            await expect(factory.connect(alice).claimOwnership(1)).to.be.revertedWith("NTF: caller != pending owner")
        })

        it("Emit OwnershipTransferred event with expected arguments", async function () {
            await factory.transferOwnership(1, Alice, false, false)

            await expect(factory.connect(alice).claimOwnership(1)).to.emit(factory, "OwnershipTransferred").withArgs(1, Deployer, Alice)
        })
    })
})
