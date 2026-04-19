// app/actions/mpesa-actions.ts
'use server'

import { PaymentPurpose, PaymentStatus, Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { mpesa } from '@/lib/mpesa';
import { prisma } from '@/lib/prisma';

const LISTING_FEE_AMOUNT = 1;

export async function initiateStkPush(phoneNumber: string, amount: number) {
  try {
    console.log('Initiating STK Push for:', phoneNumber);
    
    const response = await mpesa.client.stkPush({
      amount: amount,
      phoneNumber: phoneNumber,
      accountReference: "ORD" + Date.now().toString().slice(-9),
      transactionDesc: "Payment for order",
    });

    console.log('STK Push Response:', response);
    return { success: true, data: response };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initiate payment';
    console.error('STK Push Error:', error);
    return { 
      success: false, 
      error: message 
    };
  }
}

export async function initiateListingStkPush(phoneNumber: string) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const formattedPhone = phoneNumber.trim();
  if (!/^254\d{9}$/.test(formattedPhone)) {
    return { success: false, error: 'Use phone format 2547XXXXXXXX (example: 254795109135).' };
  }

  const accountReference = `LST${Date.now().toString().slice(-9)}`;

  try {
    const response = await mpesa.client.stkPush({
      amount: LISTING_FEE_AMOUNT,
      phoneNumber: formattedPhone,
      accountReference,
      transactionDesc: 'UniNest listing fee',
    });

    const checkoutRequestId = response.CheckoutRequestID ?? null;
    const merchantRequestId = response.MerchantRequestID ?? null;

    await prisma.payment.create({
      data: {
        userId,
        purpose: PaymentPurpose.LISTING_FEE,
        amount: LISTING_FEE_AMOUNT,
        status: PaymentStatus.PENDING,
        mpesaPhone: formattedPhone,
        checkoutRequestId,
        merchantRequestId,
        accountReference,
        transactionDesc: 'UniNest listing fee',
        resultCode: response.ResponseCode ? Number(response.ResponseCode) : null,
        resultDesc: response.ResponseDescription ?? null,
        callbackPayload: JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      data: {
        checkoutRequestId,
        merchantRequestId,
        customerMessage: response.CustomerMessage ?? 'Check your phone to complete payment.',
        amount: LISTING_FEE_AMOUNT,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initiate payment';
    console.error('STK Push Error:', error);
    return {
      success: false,
      error: message,
    };
  }
}

export async function getListingPaymentStatus(checkoutRequestId: string) {
  if (!checkoutRequestId) {
    return { success: false, error: 'Missing checkoutRequestId' };
  }

  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const payment = await prisma.payment.findFirst({
    where: {
      checkoutRequestId,
      userId,
      purpose: PaymentPurpose.LISTING_FEE,
    },
    select: {
      status: true,
      resultCode: true,
      resultDesc: true,
      mpesaReference: true,
    },
  });

  if (!payment) {
    return { success: false, error: 'Payment record not found' };
  }

  return {
    success: true,
    data: {
      status: payment.status,
      resultCode: payment.resultCode,
      resultDesc: payment.resultDesc,
      mpesaReference: payment.mpesaReference,
    },
  };
}
