// app/page.tsx
'use client'

import { Button } from "@/components/ui/button";
import { initiateStkPush } from "./actions/mpesa-actions";
import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handlePayment = async () => {
    setLoading(true);
    console.log("Initiating Mpesa STK Push...");
    
    try {
      const result = await initiateStkPush("254795109135", 1);
      
      if (result.success) {
        console.log("✅ STK Push successful:", result.data);
        setResponse(result.data);
        alert("Check your phone for the M-Pesa prompt!");
      } else {
        console.error("❌ STK Push failed:", result.error);
        alert("Payment failed: " + result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">M-Pesa Test</h1>
      
      <Button 
        onClick={handlePayment} 
        disabled={loading}
        size="lg"
      >
        {loading ? "Processing..." : "Pay KES 1 via M-Pesa"}
      </Button>

      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="text-xs">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}