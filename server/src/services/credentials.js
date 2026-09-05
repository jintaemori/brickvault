import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { User } from '../models/User.js'

function encryptionKey() {
  if (!config.encryptionKey) throw new Error('ENCRYPTION_KEY is required')
  return createHash('sha256').update(config.encryptionKey).digest()
}

export function encrypt(value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`
}

export function decrypt(value) {
  const [ivText, tagText, encryptedText] = value.split(':')
  if (!ivText || !tagText || !encryptedText) throw new Error('Stored API key is invalid')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8')
}

export async function getUserRebrickableKey(userId) {
  const user = await User.findById(userId).select('+rebrickableKey')
  if (!user?.rebrickableKey) throw new Error('Link a Rebrickable API key in settings before looking up sets')
  return decrypt(user.rebrickableKey)
}
