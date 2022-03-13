import "hardhat-deploy"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deployFunction: DeployFunction = async function ({ deployments, getChainId, getNamedAccounts }: HardhatRuntimeEnvironment) {
    console.log("Running PointList deploy script")
    const { deploy } = deployments
    const chainId = parseInt(await getChainId())
    const { deployer } = await getNamedAccounts()

    await deploy("Salary", {
        from: deployer,
        args: [(await deployments.get("YieldBox")).address],
        log: true,
        deterministicDeployment: false,
    })

    deployments.run
}

deployFunction.dependencies = ["YieldBox"]
deployFunction.tags = ["Salary"]

export default deployFunction
