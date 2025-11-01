import cors from 'cors'
import 'dotenv/config'
import express, { Express, NextFunction, Request, Response } from 'express'
import fs from 'fs'
import helmet from 'helmet'
import yaml from 'js-yaml'
import morgan from 'morgan'
import path from 'path'
import swaggerUi from 'swagger-ui-express'

import routes from './routes'

const app: Express = express()
const PORT = process.env.PORT || 3000

app.use(helmet())

const allowedOrigins = ['https://taptalent.onrender.com', 'http://localhost:3000']

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true)
            if (allowedOrigins.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
)

app.use(morgan('combined'))
app.use(express.json())

/* Swagger API Documentation Setup */
const swaggerDocument = yaml.load(
    fs.readFileSync(path.resolve(__dirname, '../docs/swagger.yaml'), 'utf8'),
) as any

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use('/', routes)

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

/* Graceful Shutdown */
process.on('SIGTERM', () => {
    console.log('SIGTERM; shutting down')
    process.exit(0)
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Docs: http://localhost:${PORT}/api-docs`)
})

export default app
