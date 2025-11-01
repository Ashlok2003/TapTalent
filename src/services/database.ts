import prisma from '../../prisma'
import type { Quote } from '../types'

export async function insertQuotes(quotes: Quote[]): Promise<void> {
    await prisma.quote.createMany({
        data: quotes.map((q) => ({
            buyPrice: q.buy_price,
            sellPrice: q.sell_price,
            source: q.source,
            timestamp: new Date(q.timestamp || new Date().toISOString()),
        })),
        skipDuplicates: true,
    })
    console.log(`Inserted ${quotes.length} quotes`)
}

export async function cleanOldQuotes(): Promise<void> {
    const deleted = await prisma.quote.deleteMany({
        where: {
            timestamp: {
                lt: new Date(Date.now() - 60000),
            },
        },
    })
    if (deleted.count > 0) console.log(`Cleaned ${deleted.count} old quotes`)
}
