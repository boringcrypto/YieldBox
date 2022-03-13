import "hardhat-deploy"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deployFunction: DeployFunction = async function ({ deployments, getChainId, getNamedAccounts }: HardhatRuntimeEnvironment) {
    console.log("Running PointList deploy script")
    const { deploy } = deployments
    const chainId = parseInt(await getChainId())
    const { deployer } = await getNamedAccounts()

    const uriBuilder = await deploy("YieldBoxURIBuilder", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    })

    await deploy("YieldBox", {
        from: deployer,
        args: ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", uriBuilder.address],
        log: true,
        deterministicDeployment: false,
    })

    deployments.run
}

deployFunction.dependencies = []
deployFunction.tags = ["YieldBox"]

export default deployFunction
