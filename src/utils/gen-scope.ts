import { bytes32Hex } from '@devprotocol/clubs-core'
import { toUtf8Bytes } from 'ethers'

export const generateScopeBy = (url: string) => bytes32Hex(toUtf8Bytes(url))
