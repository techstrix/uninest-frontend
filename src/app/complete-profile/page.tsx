"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Building2, ArrowRight } from "lucide-react";

export default function CompleteProfile() {
    const [role, setRole] = useState<'student' | 'landlord'>('student');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {   
            const res = await fetch("/api/set-role", {
                method: "POST",
                body: JSON.stringify({ role }),
            });
            router.push("/home");
        } catch (error) {
            console.error("Error setting role:", error);
        } finally {
            setIsLoading(false);
        }
    }
    ;
    
    return (
        <div className="flex min-h-screen">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#1a3c34] text-white flex-col justify-between p-6 pl-10">
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a3c34] via-[#1a3c34] to-[#163830]" />
                <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full bg-[#2a5c4a] opacity-40 blur-[100px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#2a5c4a] opacity-30 blur-[80px]" />
                <div className="absolute top-0 left-0 w-[250px] h-[80px] bg-[#3d7a65] opacity-50 blur-[40px] rounded-full" />

                <div className="relative z-10">
                    <h1 className="text-2xl font-bold italic mb-12 tracking-tight">
                        <span className="text-emerald-200">Uni</span>Nest
                    </h1>

                    <h2 className="text-[1.5rem] font-bold leading-[1.2] mb-3 max-w-[320px]">
                        Complete your profile to get started
                    </h2>
                    <p className="text-[#a3c4b8] text-[13px] leading-relaxed max-w-[320px]">
                        Choose how you want to use UniNest. Your choice determines your dashboard and features.
                    </p>
                </div>

                <div className="relative z-10 space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-[12px] text-[#c5ddd4] leading-snug">
                            Browse verified listings near your campus
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-[12px] text-[#c5ddd4]">List and manage your rental properties</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-[12px] text-[#c5ddd4]">Connect with students and landlords</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Complete Profile Form */}
            <div className="w-full lg:w-[55%] bg-white flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6">
                <div className="max-w-[400px] w-full mx-auto">
                    {/* Header */}
                    <h2 className="text-[24px] font-bold text-gray-900 mb-0.5">Complete your profile</h2>
                    <p className="text-gray-500 text-[14px] mb-6">
                        Tell us a bit about yourself so we can personalize your experience.
                    </p>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Student Option */}
                                <button
                                    type="button"
                                    onClick={() => setRole("student")}
                                    className={`relative rounded-lg p-4 text-left transition-all border-2 ${
                                        role === "student"
                                            ? "border-[#1a3c34] bg-white shadow-sm"
                                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                        role === "student" ? "bg-[#1a3c34]" : "bg-gray-100"
                                    }`}>
                                        <GraduationCap className={`w-5 h-5 ${role === "student" ? "text-white" : "text-gray-600"}`} />
                                    </div>
                                    <p className="font-semibold text-sm text-gray-900">Student</p>
                                    <p className="text-[11px] text-gray-500 leading-snug mt-0.5">Looking for housing near campus</p>
                                    {role === "student" && (
                                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#1a3c34] flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>

                                {/* Landlord Option */}
                                <button
                                    type="button"
                                    onClick={() => setRole("landlord")}
                                    className={`relative rounded-lg p-4 text-left transition-all border-2 ${
                                        role === "landlord"
                                            ? "border-[#1a3c34] bg-white shadow-sm"
                                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                        role === "landlord" ? "bg-[#1a3c34]" : "bg-gray-100"
                                    }`}>
                                        <Building2 className={`w-5 h-5 ${role === "landlord" ? "text-white" : "text-gray-600"}`} />
                                    </div>
                                    <p className="font-semibold text-sm text-gray-900">Landlord</p>
                                    <p className="text-[11px] text-gray-500 leading-snug mt-0.5">Listing and managing properties</p>
                                    {role === "landlord" && (
                                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#1a3c34] flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Info text */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500">
                                {role === "student" 
                                    ? "As a student, you'll be able to search and apply for verified listings near your campus, save favorites, and contact landlords."
                                    : "As a landlord, you'll be able to list your properties, manage bookings, and receive payments via M-Pesa."
                                }
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-10 bg-[#1a3c34] hover:bg-[#15332c] disabled:bg-[#1a3c34]/70 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? "Setting up..." : "Continue"}
                            {!isLoading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}