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

export const session = {
  '$.session': {
    type: SchemaFieldTypes.TAG,
    AS: 'session',
  },
} satisfies RediSearchSchema

export const status = {
  '$.status': {
    type: SchemaFieldTypes.TAG,
    AS: 'status',
  },
} satisfies RediSearchSchema

export const order_id = {
  '$.order_id': {
    type: SchemaFieldTypes.TAG,
    AS: 'order_id',
  },
} satisfies RediSearchSchema

export const ordered_at = {
  '$.ordered_at': {
    type: SchemaFieldTypes.NUMERIC,
    AS: 'ordered_at',
  },
} satisfies RediSearchSchema

export const group = {
  '$.group': {
    type: SchemaFieldTypes.TAG,
    AS: 'group',
  },
} satisfies RediSearchSchema

export const CARTITEM_SCHEMA = {
  ...scope,
  ...eoa,
  ...payload,
  ...quantity,
  ...status,
  ...session,
  ...group,
  ...order_id,
  ...ordered_at,
}

export const CARTITEM_SCHEMA_ID = keccak256(
  toUtf8Bytes(encode(CARTITEM_SCHEMA)),
)
