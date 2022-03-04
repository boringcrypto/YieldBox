import { expect } from "chai"
import { ethers } from "hardhat"
import { ERC1155Mock, ERC1155Mock__factory } from "../typechain-types"

describe("ERC1155", function () {
    let erc1155: ERC1155Mock

    it("Deploy ERC1155", async function () {
        const { deployer, alice, bob, carol } = await ethers.getNamedSigners()
        erc1155 = await new ERC1155Mock__factory(deployer).deploy()
        await erc1155.deployed()
    })

    it("Mint tokens", async function () {
        const { deployer, alice, bob, carol } = await ethers.getNamedSigners()
        const tx = await erc1155.mint(alice.address, 12, 1234)
        await tx.wait()
    })
})
