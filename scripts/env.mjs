// Reads a setting from the host's environment variables or the local .env file.
import { existsSync, readFileSync } from 'node:fs'
const file = existsSync('.env')
  ? Object.fromEntries(readFileSync('.env', 'utf8').split('\n').map((l) => l.match(/^\s*(\w+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
  : {}
export const get = (k) => process.env[k] || file[k] || ''
