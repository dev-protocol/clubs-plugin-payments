import { hexlify, randomBytes } from 'ethers'

export const randomHash = (length = 32) => hexlify(randomBytes(length)).slice(2)
