import type { ClubsI18nParts } from '@devprotocol/clubs-core'

export const Strings = {
  Email: { en: 'Email', ja: 'メールアドレス' },
  EmailPlaceholder: { en: 'Enter your email', ja: 'あなたのメールアドレス' },
  Account: { en: 'Account', ja: 'アカウント' },
  FullName: { en: 'Your name', ja: '名前' },
  FullNamePlaceholder: { en: 'Enter your name', ja: 'あなたの名前' },
  PayWithACreditCard: {
    en: 'Pay with a credit card',
    ja: 'クレジットカードで支払う',
  },
  JPY: {
    en: 'YEN',
    ja: '円',
  },
  Waiting: {
    en: 'Please wait until the purchase is complete.',
    ja: '購入が完了するまでお待ちください。',
  },
} satisfies ClubsI18nParts
