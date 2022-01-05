const { weth, getBigNumber } = require("../test/utilities")

module.exports = async function (hre) {
  const signers = await hre.ethers.getSigners()
  let chainId = await hre.getChainId()
  if (chainId == 31337) {
    chainId = 1; // Assume mainnet forking
  }
  if (!weth(chainId)) {
    console.log("No WETH address for chain", chainId)
    return;
  }
  console.log(chainId)

  const gasPrice = await signers[0].provider.getGasPrice()
  let multiplier = hre.network.tags && hre.network.tags.staging ? 2 : 1
  let finalGasPrice = gasPrice.mul(multiplier)
  const gasLimit = 5000000
  if (chainId == "88" || chainId == "89") {
    finalGasPrice = getBigNumber("10000", 9)
  }
  console.log("Gasprice:", gasPrice.toString(), " with multiplier ", multiplier, "final", finalGasPrice.toString())

  console.log("Sending native token to fund deployment:", finalGasPrice.mul(gasLimit + 190000).toString())
  let tx = await signers[0].sendTransaction({
    to: signers[1].address,
    value: finalGasPrice.mul(gasLimit + 190000),
    gasPrice: gasPrice.mul(multiplier)
  });
  await tx.wait();

  console.log("Deploying contract")
  tx = await hre.deployments.deploy("YieldBox", {
    from: signers[1].address,
    args: [weth(chainId)],
    log: true,
    deterministicDeployment: false,
    gasLimit: gasLimit,
    gasPrice: finalGasPrice
  })
}
