import { Prefix } from './prefix'

export const generateCartItemKey = (
  scope: string,
  eoa: string,
  session: string,
  payload: string,
) => `${Prefix.Cart}::${scope}:${eoa}:${session}:${payload}`
