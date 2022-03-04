module.exports = {
    hardhat: {
        namedAccounts: {
            deployer: {
                default: 0, // here this will by default take the first account as deployer
            },
        },
        networks: {
            hardhat: {
                forking: {
                    blockNumber: 13178051,
                    blockGasLimit: 20000000,
                }
            }
        },
        solidity: {
            version: "0.8.9",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 50000
                }
            }
        }      
    },
    solcover: {},
    prettier: {},
}
