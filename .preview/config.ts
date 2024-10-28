/* eslint-disable functional/functional-parameters */
import { encode } from '@devprotocol/clubs-core'

export default () =>
  encode({
    name: 'Debug',
    twitterHandle: '@debug',
    description: '',
    url: '',
    propertyAddress: '0xF5fb43b4674Cc8D07FB45e53Dc77B651e17dC407',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com/',
    adminRolePoints: 0,
    plugins: [
      {
        id: 'example-theme',
        options: [],
      },
      {
        id: 'devprotocol:clubs:plugin:clubs-payments',
        options: [
          { key: 'debug', value: true },
          {
            key: 'override',
            value: [
              {
                id: 'id',
                importFrom: 'devprotocol:clubs:simple-memberships',
                key: 'memberships',
                payload: new Uint8Array([0, 1, 2]), // 0xf84a97f1f0a956e738abd85c2e0a5026f8874e3ec09c8f012159dfeeaab2b156
                price: {
                  yen: 2000,
                },
              },
            ],
          },
        ],
      },
      {
        id: 'devprotocol:clubs:simple-memberships',
        name: 'memberships',
        enable: true,
        options: [
          {
            key: 'memberships',
            value: [
              {
                id: 'id',
                name: 'Debug',
                description: 'Debug',
                price: 0.000001,
                currency: 'MATIC',
                imageSrc: 'https://i.imgur.com/4Qc8iDc.png',
                payload: new Uint8Array([0, 1, 2]), // 0xf84a97f1f0a956e738abd85c2e0a5026f8874e3ec09c8f012159dfeeaab2b156
              },
            ],
          },
        ],
      },
    ],
  })
