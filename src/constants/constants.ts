interface Constants {
    chainId: number,
    network: {
        chainId: string,
        chainName: string,
        nativeCurrency:
            {
                name: string,
                symbol: string,
                decimals: number
            },
        rpcUrls: string[],
        blockExplorerUrls: string[],
    },
    yieldbox: string
}

export {
    Constants
}