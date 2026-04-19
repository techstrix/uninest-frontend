// app/api/mpesa/callback/route.ts
import { NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type CallbackMetadataItem = {
  Name?: string;
  Value?: string | number;
};

function getCallbackMetadataValue(metadata: CallbackMetadataItem[], name: string) {
  return metadata.find((item) => item?.Name === name)?.Value;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 M-PESA CALLBACK RECEIVED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const callback = data.Body?.stkCallback;
    
    if (!callback) {
      console.log('⚠️ Invalid callback structure');
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback' });
    }

    // Check if payment was successful
    if (callback.ResultCode === 0) {
      console.log('✅ PAYMENT SUCCESSFUL!');
      
      const metadata = callback.CallbackMetadata?.Item || [];
      
      const amount = getCallbackMetadataValue(metadata, 'Amount');
      const mpesaReceiptNumber = getCallbackMetadataValue(metadata, 'MpesaReceiptNumber');
      const phoneNumber = getCallbackMetadataValue(metadata, 'PhoneNumber');
      const transactionDate = getCallbackMetadataValue(metadata, 'TransactionDate');

      console.log('💰 Amount:', amount);
      console.log('🧾 Receipt:', mpesaReceiptNumber);
      console.log('📱 Phone:', phoneNumber);
      console.log('📅 Date:', transactionDate);

      await prisma.payment.updateMany({
        where: { checkoutRequestId: callback.CheckoutRequestID },
        data: {
          status: PaymentStatus.SUCCESS,
          mpesaReference: mpesaReceiptNumber ? String(mpesaReceiptNumber) : null,
          transactionDateRaw: transactionDate ? String(transactionDate) : null,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
          callbackPayload: data,
          confirmedAt: new Date(),
          failedAt: null,
        },
      });

    } else {
      console.log('❌ PAYMENT FAILED!');
      console.log('Error Code:', callback.ResultCode);
      console.log('Error Message:', callback.ResultDesc);

      await prisma.payment.updateMany({
        where: { checkoutRequestId: callback.CheckoutRequestID },
        data: {
          status: PaymentStatus.FAILED,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
          callbackPayload: data,
          failedAt: new Date(),
        },
      });
    }

    // Always respond to M-Pesa
    return NextResponse.json({ 
      ResultCode: 0, 
      ResultDesc: 'Success' 
    });

  } catch (error) {
    console.error('❌ Callback Error:', error);
    return NextResponse.json({ 
      ResultCode: 1, 
      ResultDesc: 'Failed' 
    });
  }
}
