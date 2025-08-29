export const headers = (opts?: { maxAge?: number }) => ({
  'Content-Type': 'application/json',
  ...(opts?.maxAge
    ? { 'Cache-Control': `public, max-age=${opts.maxAge}` }
    : {}),
})
