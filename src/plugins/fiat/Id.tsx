import React, {
  MouseEvent,
  ChangeEvent,
  useState,
  useEffect,
  useMemo,
} from 'react'
import type { Product } from '@constants/products'
import { version } from '@crossmint/client-sdk-react-ui/package.json'
import {
  Currency,
  clientNames,
  crossmintModalService,
  crossmintPayButtonService,
} from '@crossmint/client-sdk-base'
import { utils } from 'ethers'
import { onMountClient } from '@devprotocol/clubs-core/events'

export type ExtendedProducts = (Product & { purchaseLink?: string })[]

type Params = {
  cm: {
    projectId: string
    collectionId: string
    environment?: string
  }
  paymentCurrency?: Currency
  product: Product
}

export default ({ cm, paymentCurrency, product }: Params) => {
  const [connecting, setConnecting] = useState(false)
  const [usingWallet, setUsingWallet] = useState(true)
  const [account, setAccount] = useState<string>()
  const [email, setEmail] = useState<string>('')

  console.log({ paymentCurrency, connecting, account, email })

  const { connect } = useMemo(
    () =>
      crossmintModalService({
        clientId: cm.collectionId,
        projectId: cm.projectId,
        environment: cm.environment,
        setConnecting,
        locale: 'en-US',
        currency: paymentCurrency ?? 'USD',
        libVersion: version,
        showOverlay: true,
        clientName: clientNames.reactUi,
      }),
    [cm, paymentCurrency],
  )
  const { handleClick } = useMemo(
    () =>
      crossmintPayButtonService({
        connecting,
        locale: 'en-US',
      }),
    [connecting],
  )

  const _handleClick = useMemo(
    () => (event: MouseEvent<HTMLButtonElement>) =>
      handleClick(event, () =>
        connect(
          {
            type: 'erc-721', // Required param of Crossmint
            quantity: '1', // Required param of Crossmint
            totalPrice: '1', // TODO: Replace the value to a calculated MATIC amount in YEN
            /**
             * TODO: Change the following options to match the new SwapAndStake contract interface.
             */
            _payload: utils.keccak256(product.payload),
          },
          account, // Destination EOA
          account ? undefined : email, // Destination Email
        ),
      ),
    [account, email],
  )

  const _handleChange = useMemo(
    () => (event: ChangeEvent<HTMLInputElement>) =>
      setEmail(event.currentTarget.value),
    [],
  )

  const _toggleUsingWallet = useMemo(
    () => () => {
      const next = !usingWallet
      setUsingWallet(next)
      next && setEmail('')
    },
    [usingWallet],
  )

  useEffect(() => {
    onMountClient(async () => {
      const [{ connection }] = await Promise.all([
        import('@devprotocol/clubs-core/connection'),
      ])
      connection().account.subscribe(setAccount)
    })
  })

  return (
    <>
      <div className="bg-black relative mx-auto mb-12 grid items-start rounded-xl p-4 shadow lg:container lg:mt-12 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col gap-8">
          <h2 className="text-4xl font-bold">Buy</h2>
          <div className="grid gap-4">
            {usingWallet && (
              <>
                <h3 className="mb-4 text-2xl">Wallet</h3>
                {account && (
                  <p className="truncate p-2 rounded-md text-xl bg-gray-500/60 border-[3px] border-transparent">
                    {account}
                  </p>
                )}
                {!account && (
                  <p className="p-2 rounded-md text-xl animate-pulse bg-gray-500/60 border-[3px] border-transparent	text-center">
                    Please connect a wallet
                  </p>
                )}
                <button
                  onClick={_toggleUsingWallet}
                  className="rounded-full p-1 bg-gray-800"
                >
                  Or use email instead
                </button>
              </>
            )}
            {!usingWallet && (
              <>
                <h3 className="mb-4 text-2xl">Email</h3>
                <input
                  className="p-2 rounded-md text-xl bg-gray-500/60 outline-0 transition-colors border-[3px] border-gray-500/60 focus:border-gray-300"
                  placeholder="Enter your email"
                  type="email"
                  onChange={_handleChange}
                  value={email}
                />
                <button
                  onClick={_toggleUsingWallet}
                  className="rounded-full p-1 bg-gray-800"
                >
                  Or use wallet
                </button>
              </>
            )}
          </div>
          <button
            className="rounded-full my-8 transition-colors hover:bg-blue-600 bg-blue-600/40 border-blue-600 border-[3px] w-full disabled:border-gray-400 disabled:bg-gray-600 p-2 px-4 text-2xl disabled:text-gray-400"
            onClick={_handleClick}
            disabled={
              connecting ||
              (usingWallet && !account) ||
              (!usingWallet && !email)
            }
          >
            Checkout
          </button>
        </section>
        <section className="flex flex-col gap-6">
          <div className="bg-white/10 p-4 rounded-lg border border-white/20">
            <img
              src={product.imageSrc}
              alt={product.imageAlt}
              className="h-auto rounded w-full object-cover object-center sm:h-full sm:w-full"
            />
          </div>
          <div>
            <h3 className="text-sm text-white/50">
              <span>{product.name}</span>
            </h3>
            <p className="text-2xl mt-2">
              {`${Number(product.price).toLocaleString()} ${product.currency}`}
            </p>
            {product.description && (
              <p className="text-xl mt-6 text-white/80">
                {product.description}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}