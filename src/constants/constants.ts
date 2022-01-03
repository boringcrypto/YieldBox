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
    pixel: string,
    canvas: string
}

export {
    Constants
}