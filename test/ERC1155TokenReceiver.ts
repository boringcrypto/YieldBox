import chai, { assert, expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ERC1155TokenReceiver, ERC1155TokenReceiver__factory } from "../typechain-types"
chai.use(solidity)

describe("ERC1155TokenReceiver", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let receiver: ERC1155TokenReceiver

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address
        receiver = await new ERC1155TokenReceiver__factory(deployer).deploy()
        await receiver.deployed()
    })

    it("Deploy ERC1155TokenReceiver", async function () {
        assert.equal((await receiver.deployTransaction.wait()).status, 1)
    })

    it("responds correctly to onERC1155Received", async function () {
        expect(await receiver.onERC1155Received(Alice, Bob, 12, 123, "0x1234")).equals("0xf23a6e61")
    })

    it("responds correctly to onERC1155BatchReceived", async function () {
        expect(await receiver.onERC1155BatchReceived(Alice, Bob, [12], [123], "0x1234")).equals("0xbc197c81")
    })
})
