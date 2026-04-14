"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import {toast} from "sonner"

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {isSignedIn,user} = useUser();
  const router = useRouter();
  const {isLoaded,signIn,setActive} = useSignIn();
  const params = useSearchParams();  
  useEffect(() => {
    if(!isLoaded) return;

    if(isSignedIn){
      router.push("/home");
    }
  })

  if(!isLoaded) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Signed in successfully!");
        router.push("/home");
      } else {
        console.error("Unexpected sign-in state:", result);
      }
    }catch (err) {
      console.error("Sign-in error:", err);
      toast.error("Failed to sign in. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
   

    }

     const signInWithGoogle = () =>  {

      setIsLoading(true);
      return signIn.authenticateWithRedirect({  
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/home",
      
      });
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

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-[55%] bg-white flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6">
        <div className="max-w-[400px] w-full mx-auto">
          {/* Header */}
          <h2 className="text-[24px] font-bold text-gray-900 mb-0.5">Welcome back</h2>
          <p className="text-gray-500 text-[14px] mb-4">Sign in to your UniNest account</p>

 

          {/* Form Fields */}
          <form className="space-y-2.5" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.mwangi@students.uonbi.ac.ke"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent"
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full h-10 bg-[#1a3c34] hover:bg-[#15332c] text-white font-semibold text-sm rounded-lg transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-xs text-gray-400">or continue with</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full h-10 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            {/* Google multi-color G icon */}
            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? "Redirecting..." : "Sign in with Google"}
          </button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-gray-900 font-semibold underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
