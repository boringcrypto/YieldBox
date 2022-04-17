import Decimal from "decimal.js-light"
import { NetworkConnector } from "../../sdk/NetworkConnector"
import { ERC20Token, SLPToken, Token, tokens } from "./TokenManager"

export class CoinGecko {
    async getPrices(connector: NetworkConnector, _tokens: Token[]) {
        const addresses = _tokens.filter((token) => token.constructor === Token).map((token) => token.address)
        while (addresses.length) {
            try {
                const url =
                    "https://api.coingecko.com/api/v3/simple/token_price/" +
                    connector.coinGeckoId +
                    "?contract_addresses=" +
                    addresses.splice(0, 100).join(",") +
                    "&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false&include_24hr_change=false&include_last_updated_at=false"

                const result = await (await fetch(url)).json()
                for (const price of Object.entries(result)) {
                    const token = tokens.get(connector.chainId, price[0])
                    ;(token.details as ERC20Token).price = new Decimal((price[1] as any).usd as string)
                }
            } catch (e) {
                console.log(e)
            }
        }
    }
}
