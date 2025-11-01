import type { Quote, Average } from '../types'

export function getAverage(quotes: Quote[]): Average {
    const buys = quotes.map((q) => q.buy_price)
    const sells = quotes.map((q) => q.sell_price)
    const avgBuy = buys.reduce((sum, price) => sum + price, 0) / buys.length
    const avgSell = sells.reduce((sum, price) => sum + price, 0) / sells.length
    return {
        average_buy_price: parseFloat(avgBuy.toFixed(2)),
        average_sell_price: parseFloat(avgSell.toFixed(2)),
        timestamp: new Date().toISOString(),
    }
}
