import request from 'supertest'
import app from '../src/index'

describe('API Endpoints', () => {
    it('should return quotes array', async () => {
        const res = await request(app).get('/quotes')
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body[0]).toHaveProperty('buy_price')
    })

    it('should return average object', async () => {
        const res = await request(app).get('/average')
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('average_buy_price')
    })
})
