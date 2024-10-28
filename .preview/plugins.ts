import theme from './theme'
import thisPlugin from '../src/index'
import type { ClubsFunctionPlugin } from '@devprotocol/clubs-core'

export default [
  theme,
  thisPlugin,
  {
    meta: { id: 'devprotocol:clubs:simple-memberships' },
  } as ClubsFunctionPlugin,
]
