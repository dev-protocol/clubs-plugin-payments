/* eslint-disable functional/no-expression-statements */
import type { AsyncReturnType } from 'type-fest'
import {
  isNotError,
  whenDefined,
  whenNotError,
  whenNotErrorAll,
} from '@devprotocol/util-ts'

import { CARTITEM_SCHEMA, CARTITEM_SCHEMA_ID } from '../db/schema'
import { Redis } from '@devprotocol/clubs-core/redis'
import { Index, Prefix, SchemaKey } from './prefix'

export const reindex = async (
  defaultClient?: AsyncReturnType<(typeof Redis)['client']>,
) => {
  const client = defaultClient ? defaultClient : await Redis.client()

  const scm = await whenNotError(
    client,
    (c) =>
      whenDefined(c, (_c) =>
        _c
          .get(SchemaKey.Cart)
          .then((res) => res)
          .catch((err: Error) => err),
      ) ?? new Error('Failed to get schema key'),
  )

  const shouldIndex = whenNotError(scm, (schemaId) =>
    schemaId === CARTITEM_SCHEMA_ID ? false : true,
  )

  const droppedIndex = await whenNotErrorAll(
    [shouldIndex, client],
    ([_shouldIndex, _client]) => {
      return _shouldIndex
        ? _client.ft
            .dropIndex(Index.Cart)
            .then(() => {
              console.log(`### Dropped old index: ${Index.Cart}`)
              return true
            })
            .catch((err: Error) => {
              console.log(`### Error dropping old index: ${Index.Cart}`, err)
              return err
            })
        : false
    },
  )

  const createdUpdatedIndex = await whenNotErrorAll(
    [droppedIndex, client],
    ([_droppedIndex, _client]) => {
      return _droppedIndex
        ? _client.ft
            .create(Index.Cart, CARTITEM_SCHEMA, {
              ON: 'JSON',
              PREFIX: Prefix.Cart,
            })
            .then(() => {
              console.log(`### Created new index: ${Index.Cart}`)
              return true
            })
            .catch((err: Error) => {
              console.log(`!!! Error creating new index: ${Index.Cart}`, err)
              return err
            })
        : false
    },
  )

  const setNewSchemaKey = await whenNotErrorAll(
    [createdUpdatedIndex, client],
    ([_createdUpdatedIndex, _client]) => {
      return _createdUpdatedIndex
        ? _client
            .set(SchemaKey.Cart, CARTITEM_SCHEMA_ID)
            .then(() => {
              console.log(`### Set new schema key: ${SchemaKey.Cart}`)
              return true
            })
            .catch((err: Error) => {
              console.log(
                `!!! Error setting new schema key: ${SchemaKey.Cart}`,
                err,
              )
              return err
            })
        : false
    },
  )

  // If default client is not present then
  // we are connecting and using client in reindex() function.
  // hence we close it since it was initialized and connected in the function itself.
  await whenDefined(
    defaultClient,
    async (defaultClient) => !defaultClient && (await client.quit()),
  )

  return setNewSchemaKey
}

/**
 * Returns a redis client from the given async function with checking the current schema is indexed.
 * @param getClient - a function that returns redis client
 * @returns the redis client
 */
export const withCheckingIndex = async <
  T extends (typeof Redis)['client'] = (typeof Redis)['client'],
>(
  getClient: T,
): Promise<AsyncReturnType<T> | Error> => {
  const client = (await getClient()) as AsyncReturnType<T>
  const reIndexed = await reindex(client)
  return isNotError(reIndexed) ? client : reIndexed
}

export default reindex
