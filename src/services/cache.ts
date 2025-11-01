import NodeCache from 'node-cache'
import { getQuotes } from './scraper'
import type { Quote } from '../types'

const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 })

export async function getCachedQuotes(): Promise<Quote[]> {
    if (cache.has('quotes')) {
        const cached = cache.get<Quote[]>('quotes')
        if (cached && cached.length > 0) {
            console.log('Serving from cache')
            return cached
        }
    }
    console.log('Fetching fresh quotes')
    const quotes = await getQuotes()
    if (quotes.length > 0) {
        cache.set('quotes', quotes)
    }
    return quotes
}
