import { encode } from '@devprotocol/clubs-core'

export default () =>
  encode({
    name: 'Debug',
    twitterHandle: '@debug',
    description: '',
    url: '',
    propertyAddress: '',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com/',
    adminRolePoints: 50,
    plugins: [
      {
        id: 'example-theme',
        options: [],
      },
      {
        id: 'devprotocol:clubs:plugin:clubs-payments',
        options: [],
      },
    ],
  })
