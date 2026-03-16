"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1a3c34] border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Processing sign in...</p>
      </div>
      
      {/* Clerk handles the OAuth callback and redirects automatically */}
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
