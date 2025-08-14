import { Redis } from '@devprotocol/clubs-core/redis'
import { hexlify, randomBytes } from 'ethers'

export const CLUBSX_ASSET_IDX = 'idx::clubs:asset'
export const CLUBSX_ASSET_PREFIX_DOC = 'doc::clubs:asset'

export const generateAssetKey = (contract: string, id?: string | number) =>
  `${CLUBSX_ASSET_PREFIX_DOC}::${contract}:${id ?? ''}`

export const assetDocument = ({
  type,
  contract,
  id,
  owner,
  propertyAddress,
  payload,
}: {
  readonly type: 'nft' | 'passportItem'
  readonly contract: string
  readonly id?: string
  readonly owner: string
  readonly propertyAddress: string
  readonly payload: string
}) =>
  ({
    type,
    contract,
    id: `pre-${id ?? hexlify(randomBytes(8)).slice(2)}`,
    owner,
    balance: '1',
    propertyAddress,
    payload,
  }) as const

export const createAssetDocument = async ({
  doc,
}: {
  readonly doc: ReturnType<typeof assetDocument>
}) => {
  const client = await Redis.client()
  const key = generateAssetKey(doc.contract, doc.id)
  const add = await client.json.set(key, '$', doc)
  return add
}
