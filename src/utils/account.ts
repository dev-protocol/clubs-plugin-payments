import { verifyMessage } from 'ethers'
import { tryCatch } from 'ramda'

export const verify = ({
  message,
  signature,
}: {
  message: string
  signature: string
}) => {
  const eoa = tryCatch(
    (msg: string, sig: string) => verifyMessage(msg, sig),
    (err: Error) => err,
  )(message, signature)

  return eoa
}
