import mongoose from 'mongoose'
import { config } from './config.js'

export async function connectDb() {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is required')
  }

  await mongoose.connect(config.mongodbUri)
  console.log('Connected to MongoDB')
}
