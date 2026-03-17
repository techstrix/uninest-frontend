import type { Metadata } from "next";
import { Roboto ,DM_Sans} from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "sonner"

import "./globals.css";


const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Uninest",
  description: "Find your ideal student housing near University of Nairobi. Built for UoN students and landlords in the estates around campus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
            <ClerkProvider>

    <html lang="en">
      <body
        className={dmSans.className}
      >
          {children}
          <Toaster />
      </body>
    </html>
        </ClerkProvider>

  );
}
