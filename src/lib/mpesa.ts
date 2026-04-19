import { createMpesa } from '@singularity-payments/nextjs';

export const mpesa = createMpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  passkey: process.env.MPESA_PASSKEY!,
  shortcode: process.env.MPESA_SHORTCODE!,
  environment: "sandbox",
  callbackUrl: `${process.env.NEXT_PUBLIC_URL!}/api/mpesa/callback`,
});
