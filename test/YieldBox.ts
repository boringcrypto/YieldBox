import { expect } from "chai"
import { ethers } from "hardhat"
import { WETH9Mock__factory, YieldBoxURIBuilder__factory, YieldBox__factory } from "../typechain-types"

describe("YieldBox", function () {
    it("Deploy YieldBox", async function () {
        const deployer = (await ethers.getSigners())[0]
        const weth = await new WETH9Mock__factory(deployer).deploy()
        await weth.deployed()

        const uriBuilder = await new YieldBoxURIBuilder__factory(deployer).deploy()

        const yieldBox = await new YieldBox__factory(deployer).deploy(weth.address, uriBuilder.address)

        ;(await yieldBox.createToken("BoringToken", "BORING", 18)).wait()

        /*console.log(await yieldBox.assets(1));
    console.log(await yieldBox.nativeTokens(1));
    console.log((await yieldBox.totalSupply(1)).toString());
    console.log(await uriBuilder.uri(1))*/
    })
})
