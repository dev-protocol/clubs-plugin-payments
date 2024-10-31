/* eslint-disable functional/no-expression-statements */

import { LibraryPath } from '../constants'

/**
 * Load the required script of Veritrans
 * @param {Object} options - all the options
 * @param {string} options.clientKey - the public client key
 * @returns Promise that will be resolved by loading script
 */
export const loadLibrary = async ({ clientKey }: { clientKey: string }) => {
  if (
    (typeof document !== 'undefined' &&
      document.querySelector(
        `script[src="${LibraryPath}"][data-client-key="${clientKey}"]`,
      ) !== null) ||
    typeof document === 'undefined'
  ) {
    return
  }

  const script = document.createElement('script')
  script.setAttribute('src', LibraryPath)
  script.setAttribute('data-client-key', clientKey)
  document.body.appendChild(script)
  // eslint-disable-next-line functional/no-return-void
  return new Promise((res, rej) => {
    script.addEventListener('load', res)
    script.addEventListener('error', rej)
  })
}
