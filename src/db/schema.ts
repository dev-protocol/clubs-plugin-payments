import { keccak256, toUtf8Bytes } from 'ethers'
import { encode } from '@devprotocol/clubs-core'
import { SchemaFieldTypes, type RediSearchSchema } from 'redis'

export const scope = {
  '$.scope': {
    type: SchemaFieldTypes.TAG,
    AS: 'scope',
  },
} satisfies RediSearchSchema

export const eoa = {
  '$.eoa': {
    type: SchemaFieldTypes.TAG,
    AS: 'eoa',
  },
} satisfies RediSearchSchema

export const payload = {
  '$.payload': {
    type: SchemaFieldTypes.TAG,
    AS: 'payload',
  },
} satisfies RediSearchSchema

export const quantity = {
  '$.quantity': {
    type: SchemaFieldTypes.NUMERIC,
    AS: 'quantity',
    SORTABLE: true,
  },
} satisfies RediSearchSchema

export const CARTITEM_SCHEMA = {
  ...scope,
  ...eoa,
  ...payload,
  ...quantity,
}

export const CARTITEM_SCHEMA_ID = keccak256(
  toUtf8Bytes(encode(CARTITEM_SCHEMA)),
)
