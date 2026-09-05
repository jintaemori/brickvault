import 'dotenv/config'

const required = ['MONGODB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY']

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set`)
  }
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  brickOwlApiKey: process.env.BRICKOWL_API_KEY || '',
}
