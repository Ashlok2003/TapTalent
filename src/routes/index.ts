import { Router, Request, Response } from 'express'
import { getCachedQuotes } from '../services/cache'
import { getAverage } from '../services/average'
import { getSlippage } from '../services/slippage'
import type { Quote, Average, Slippage } from '../types'

const router = Router()

router.get('/quotes', async (req: Request, res: Response) => {
    try {
        const quotes: Quote[] = await getCachedQuotes()
        if (quotes.length === 0) {
            return res.status(503).json({ error: 'No quotes; sources down?' })
        }
        res.json(quotes)
    } catch (error) {
        console.error('Quotes error:', error)
        res.status(500).json({ error: 'Failed to fetch quotes' })
    }
})

router.get('/average', async (req: Request, res: Response) => {
    try {
        const quotes: Quote[] = await getCachedQuotes()
        if (quotes.length === 0) {
            return res.status(503).json({ error: 'No quotes available' })
        }
        const average: Average = getAverage(quotes)
        res.json(average)
    } catch (error) {
        console.error('Average error:', error)
        res.status(500).json({ error: 'Failed to calculate average' })
    }
})

router.get('/slippage', async (req: Request, res: Response) => {
    try {
        const quotes: Quote[] = await getCachedQuotes()
        if (quotes.length === 0) {
            return res.status(503).json({ error: 'No quotes available' })
        }

        const average: Average = getAverage(quotes)
        const slippages: Slippage[] = getSlippage(quotes, average)
        res.json(slippages)
    } catch (error) {
        console.error('Slippage error:', error)
        res.status(500).json({ error: 'Failed to calculate slippage' })
    }
})

router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})

export default router
