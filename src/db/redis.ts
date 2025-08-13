import { Prefix } from './prefix'

export const generateCartItemKey = (
  scope: string,
  eoa: string,
  payload: string,
) => `${Prefix.Cart}::${scope}:${eoa}:${payload}`
