export interface Quote {
    buy_price: number
    sell_price: number
    source: string
    timestamp?: string
}

export interface Average {
    average_buy_price: number
    average_sell_price: number
    timestamp?: string
}

export interface Slippage {
    buy_price_slippage: number
    sell_price_slippage: number
    source: string
}

export interface SourceConfig {
    url: string
    name: string
    buySelector: string
    sellSelector: string
}
