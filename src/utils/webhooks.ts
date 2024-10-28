export enum Status {
  Success = 'success',
}

export const createRequestBody = ({
  status,
  account,
  paymentGateway,
}: {
  status: Status
  account: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paymentGateway: Record<string, any>
}): string =>
  JSON.stringify({
    status,
    account,
    paymentGateway,
  })
