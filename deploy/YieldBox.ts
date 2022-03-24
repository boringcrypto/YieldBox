import "hardhat-deploy"
import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deployFunction: DeployFunction = async function ({ deployments, getChainId, getNamedAccounts }: HardhatRuntimeEnvironment) {
    console.log("Running PointList deploy script")
    const { deploy } = deployments
    const chainId = parseInt(await getChainId())
    const { deployer } = await getNamedAccounts()

    await ethers.provider.send("evm_setNextBlockTimestamp", [Date.now() / 1000])

    const uriBuilder = await deploy("YieldBoxURIBuilder", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
        skipIfAlreadyDeployed: false,
    })

    await deploy("YieldBox", {
        from: deployer,
        args: ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", uriBuilder.address],
        log: true,
        deterministicDeployment: false,
    })
}

deployFunction.dependencies = []
deployFunction.tags = ["YieldBox"]

export default deployFunction
