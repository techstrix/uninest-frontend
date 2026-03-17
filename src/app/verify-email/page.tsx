"use client";

import { useEffect, useState } from "react";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import {toast} from "sonner"
import Link from "next/link";

export default function VerifyEmail() {
  const [email, setEmail] = useState("");
  const [isLoading,setIsLoading] = useState(false);
  const [code,setCode] = useState("");
  const router = useRouter();  
  const [countdown,setCountdown] = useState(0);
  const {isLoaded,signUp,setActive } = useSignUp();
  const [resending,setResending] = useState(false);
  const [status,setStatus] = useState("");
  const userEmail = signUp?.emailAddress || "";
  useEffect(() => {
    if(isLoaded && !signUp){
      router.push("/sign-up");
    }

  },[isLoaded,signUp,router]);  
  const handleResendCode = async () => {  
    if (!isLoaded || !signUp || countdown > 0) return;
    setResending(true);
    try{
      await signUp.prepareEmailAddressVerification({strategy:"email_code"});
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if(prev <= 1){
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        })
      },1000);

    }catch(err){
      console.error("Error resending code:", err);
    }
    finally{
      setResending(false);
    }



  }
  const handleVerifyEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsLoading(true);
    try {
      const completeSignup = await signUp?.attemptEmailAddressVerification({ code });
      if(completeSignup?.status === "complete"){  
        setStatus("Email verified successfully! Redirecting...");
       toast.success("Email verified successfully!");
        await setActive({ session: completeSignup.createdSessionId });
        router.push("/complete-profile");

      }
      else{
        console.error(JSON.stringify(completeSignup,null,2));
      }

    }catch(err){
      toast.error("Failed to verify email. Please check the code and try again.");
    }
    finally{
      setIsLoading(false);
    }
  }
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#1a3c34] text-white flex-col justify-between p-6 pl-10">
        {/* Background gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3c34] via-[#1a3c34] to-[#163830]" />
        <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full bg-[#2a5c4a] opacity-40 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#2a5c4a] opacity-30 blur-[80px]" />
        {/* Top-left lighter accent */}
        <div className="absolute top-0 left-0 w-[250px] h-[80px] bg-[#3d7a65] opacity-50 blur-[40px] rounded-full" />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold italic mb-12 tracking-tight">
            <span className="text-emerald-200">Uni</span>Nest
          </h1>

          <h2 className="text-[1.5rem] font-bold leading-[1.2] mb-3 max-w-[320px]">
            Find housing near your campus — verified, ranked by distance.
          </h2>
          <p className="text-[#a3c4b8] text-[13px] leading-relaxed max-w-[320px]">
            Purpose-built for University of Nairobi students and landlords in the estates around campus.
          </p>
        </div>

        {/* Features List */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4] leading-snug">
              Distance-ranked listings near Main, Chiromo & Parklands
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4]">Verified landlords — OTP & ID checked</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4]">Pay-per-listing via M-Pesa · KES 300</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4]">Fraud reporting & admin oversight</p>
          </div>
        </div>
      </div>

      {/* Right Side - Verify Email Form */}
      <div className="w-full lg:w-[55%] bg-white flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6">
        <div className="max-w-[400px] w-full mx-auto">
          {/* Header */}
          <h2 className="text-[24px] font-bold text-gray-900 mb-0.5">Verify your email</h2>
          <p className="text-gray-500 text-[14px] mb-4">
            We sent a verification code to your email {userEmail}. Enter it below to verify your account.
          </p>
           <p className="text-gray-500 text-[14px] mb-4">
          {status}
          </p>

          {/* Form */}
          <form className="space-y-3" onSubmit={handleVerifyEmail}>
            

            {/* Verification Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 text-center font-mono tracking-widest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              className="w-full h-10 bg-[#1a3c34] hover:bg-[#15332c] text-white font-semibold text-sm rounded-lg transition-colors"
              disabled={isLoading}
              
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          {/* Resend Code Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
            <button
              type="button"
              className="text-sm font-semibold text-[#1a3c34] hover:text-[#15332c] transition"
              onClick={handleResendCode}
              disabled={resending || countdown > 0}
            >
              {resending ? "Resending..." : countdown > 0 ? `Resend in ${countdown}s` : "Resend verification code"}
            </button>
          </div>

          {/* Back Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/sign-up" className="text-gray-900 font-semibold underline underline-offset-2">
              Back to sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
