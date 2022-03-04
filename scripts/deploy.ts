// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { artifacts, config, ethers, hardhatArguments, network, tasks, run, waffle } from "hardhat"
import { Greeter__factory } from "../typechain-types"

async function main() {
    const deployer = (await ethers.getSigners())[0]
    const greeter = await new Greeter__factory(deployer).deploy("Hello, Hardhat!")

    await greeter.deployed()

    console.log("Greeter deployed to:", greeter.address)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
