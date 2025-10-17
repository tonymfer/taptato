import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { type ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { Toaster } from "sonner";

import { getConfig } from "../wagmi";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sub Accounts Demo",
  description: "A demo of sub accounts in a tipping app",
};

export default function RootLayout(props: { children: ReactNode }) {
  const initialState = cookieToInitialState(
    getConfig(),
    headers().get("cookie")
  );
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers initialState={initialState}>{props.children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
