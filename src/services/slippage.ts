import type { Quote, Average, Slippage } from '../types'

export function getSlippage(quotes: Quote[], average: Average): Slippage[] {
    return quotes.map((q) => ({
        buy_price_slippage: parseFloat(
            (((q.buy_price - average.average_buy_price) / average.average_buy_price) * 100).toFixed(
                2,
            ),
        ),
        sell_price_slippage: parseFloat(
            (
                ((q.sell_price - average.average_sell_price) / average.average_sell_price) *
                100
            ).toFixed(2),
        ),
        source: q.source,
    }))
}
