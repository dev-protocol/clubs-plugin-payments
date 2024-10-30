// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/dist/runtime/server'
  export default InstanceType<AstroComponentFactory>
}

declare module '*.vue'
