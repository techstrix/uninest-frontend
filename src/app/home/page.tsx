"use client"
import { useUser,useClerk } from "@clerk/nextjs"
import {toast} from "sonner"
export default function Home() {
  const { user ,isLoaded} = useUser()  
  const {signOut} = useClerk();
      let rl;
      const role = user?.publicMetadata?.role
      if(role==="student"){
        rl = "Student"
      }else if(role === "landlord"){
        rl = "Landlord"
      } else{
        rl = ""
      }

      const handleSignOut  = () => {
        signOut({redirectUrl:"/sign-in"});
        toast.success("You have been signed out successfully.");

      }
    

  return (
    <div>
      <nav className="flex flex-row justify-between p-20">
        <h1 className="text-2xl font-bold">Uninest</h1>
        {isLoaded && user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Signed in as {user.firstName} ({rl})</span>
            <button onClick={handleSignOut} type="button" className="text-sm text-blue-500 hover:underline">
              Sign out
            </button>
          </div>
        ) : null}

      </nav>

    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome to Uninest!{rl}</h1>
      <p className="mt-4 text-lg">Your all-in-one platform for student organizations.</p>
    </main>
    </div>
  )
}