import puppeteer from 'puppeteer'
import fs from 'fs'
import { insertQuotes, cleanOldQuotes } from './database'
import type { Quote, SourceConfig } from '../types'

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
]

function randomUserAgent(): string {
    return userAgents[Math.floor(Math.random() * userAgents.length)]
}

const sources: SourceConfig[] = [
    {
        url: 'https://www.ambito.com/contenidos/dolar.html',
        name: 'ambito',
        buySelector: '.dolar-blue .compra .odometer, .dolar-blue .compra-value, .compra-value',
        sellSelector: '.dolar-blue .venta .odometer, .dolar-blue .venta-value, .venta-value',
    },
    {
        url: 'https://www.dolarhoy.com',
        name: 'dolarhoy',
        buySelector: 'span', // For sibling eval
        sellSelector: 'span',
    },
    {
        url: 'https://www.cronista.com/MercadosOnline/moneda.html?id=ARSB',
        name: 'cronista',
        buySelector: '.valor-compra .value, .moneda-compra .value, .compra-value',
        sellSelector: '.valor-venta .value, .moneda-venta .value, .venta-value',
    },
]

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function logHtmlForDebug(page: any, sourceName: string, attempt: number): Promise<void> {
    try {
        const html = await page.content()
        const snippet = html.substring(0, 2000) + (html.length > 2000 ? '...' : '')
        console.log(
            `\n=== DEBUG HTML for ${sourceName} (attempt ${attempt}) ===\n${snippet}\n=== END DEBUG ===\n`,
        )
        // fs.writeFileSync(`debug-${sourceName}-${Date.now()}.html`, html);
    } catch (e: any) {
        console.log(`Failed to log HTML for ${sourceName}:`, e.message)
    }
}

async function scrapeSource(source: SourceConfig, attempt: number = 1): Promise<Quote | null> {
    let browser
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-blink-features=AutomationControlled',
            ],
        })
        const page = await browser.newPage()
        const ua = randomUserAgent()
        await page.setUserAgent(ua)
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        })
        // FIXED: Integer viewport
        const width = Math.floor(1280 + Math.random() * 100)
        await page.setViewport({ width, height: 720 })
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            const type = req.resourceType()
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) req.abort()
            else req.continue()
        })

        await page.goto(source.url, { waitUntil: 'networkidle0', timeout: 90000 })

        await page
            .waitForFunction(
                () => !document.querySelector('[id*="cf-"]') && document.readyState === 'complete',
                { timeout: 45000 },
            )
            .catch(() => {})

        await sleep(7000 + Math.random() * 3000)

        // Log HTML after load (for tuning)
        await logHtmlForDebug(page, source.name, attempt)

        let buyText = ''
        let sellText = ''

        // Primary: Regex on innerText (reliable for tools-confirmed structures)
        const bodyText = await page.evaluate(() => document.body.innerText)
        let match = bodyText.match(
            /Dólar Blue.*?Compra\s*\$?\s*([\d.,]+).*?Venta\s*\$?\s*([\d.,]+)/is,
        )
        if (!match) {
            match = bodyText.match(
                /(Dollar|Dólar).*?(Buy|Compra)\s*\$?\s*([\d.,]+).*?(Sell|Venta)\s*\$?\s*([\d.,]+)/is,
            )
        }
        if (match && match.length >= 3) {
            buyText = match[match.length - 2]
            sellText = match[match.length - 1]
            console.log(`Regex fallback for ${source.name}: buy=${buyText}, sell=${sellText}`)
        } else {
            // General fallback
            const compraMatch = bodyText.match(/(Buy|Compra)\s*\$?\s*([\d.,]+)/i)
            const ventaMatch = bodyText.match(/(Sell|Venta)\s*\$?\s*([\d.,]+)/i)
            buyText = compraMatch ? compraMatch[2] : buyText
            sellText = ventaMatch ? ventaMatch[2] : sellText
            if (buyText || sellText)
                console.log(`General fallback for ${source.name}: buy=${buyText}, sell=${sellText}`)
        }

        // Secondary: Site-specific
        if (!buyText || !sellText) {
            if (source.name === 'dolarhoy') {
                buyText = await page.evaluate(() => {
                    const spans = Array.from(
                        document.querySelectorAll('span') as NodeListOf<HTMLSpanElement>,
                    )
                    const compraIdx = spans.findIndex((el) => el.textContent?.trim() === 'Compra')
                    return compraIdx > -1 ? spans[compraIdx + 1]?.textContent?.trim() || '' : ''
                })
                sellText = await page.evaluate(() => {
                    const spans = Array.from(
                        document.querySelectorAll('span') as NodeListOf<HTMLSpanElement>,
                    )
                    const ventaIdx = spans.findIndex((el) => el.textContent?.trim() === 'Venta')
                    return ventaIdx > -1 ? spans[ventaIdx + 1]?.textContent?.trim() || '' : ''
                })
            } else {
                const trySelectors = async (sels: string): Promise<string> => {
                    const selectors = sels.split(',').map((s) => s.trim())
                    for (const sel of selectors) {
                        try {
                            const text = await page.evaluate(
                                (s: string) => document.querySelector(s)?.textContent?.trim() || '',
                                sel,
                            )
                            if (text?.match(/[\d.,$]+/)) return text
                        } catch {}
                    }
                    return ''
                }
                buyText = await trySelectors(source.buySelector)
                sellText = await trySelectors(source.sellSelector)
            }
        }

        // Clean
        const cleanNumber = (text: string): number => {
            if (!text) return NaN
            let cleaned = text
                .replace(/[^\d.,]/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
            return parseFloat(cleaned)
        }

        let buy = cleanNumber(buyText)
        let sell = cleanNumber(sellText)

        if (isNaN(buy)) buy = parseFloat(buyText.replace(/[^\d]/g, ''))
        if (isNaN(sell)) sell = parseFloat(sellText.replace(/[^\d]/g, ''))

        if (isNaN(buy) || isNaN(sell) || buy <= 0 || sell <= 0 || buy > 3000 || sell > 3000) {
            if (attempt < 4) {
                console.log(`Retry ${source.name} (${attempt + 1}/4)`)
                await sleep(5000)
                await browser?.close()
                return scrapeSource(source, attempt + 1)
            }
            throw new Error(
                `Invalid after retries: buy=${buy} (${buyText}), sell=${sell} (${sellText})`,
            )
        }

        console.log(`Success for ${source.name}: buy=${buy}, sell=${sell}`)

        return {
            buy_price: Math.round(buy * 100) / 100,
            sell_price: Math.round(sell * 100) / 100,
            source: source.url,
            timestamp: new Date().toISOString(),
        }
    } catch (error) {
        console.error(`Failed ${source.url} (attempt ${attempt}):`, (error as Error).message)
        if (browser)
            await logHtmlForDebug(
                (await browser.pages())[0] || { content: async () => '' },
                source.name,
                attempt,
            )
        if (attempt < 4) return scrapeSource(source, attempt + 1)
        return null
    } finally {
        if (browser) await browser.close()
    }
}

export async function getQuotes(): Promise<Quote[]> {
    await cleanOldQuotes()
    const quotes: (Quote | null)[] = await Promise.all(
        sources.map((source) => scrapeSource(source)),
    )
    const validQuotes: Quote[] = quotes.filter((q): q is Quote => q !== null)
    console.log(`Fetched ${validQuotes.length} valid quotes`)
    if (validQuotes.length > 0) await insertQuotes(validQuotes)
    return validQuotes
}
