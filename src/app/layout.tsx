import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { headers } from "next/headers";
import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { cookieToInitialState } from "wagmi";
import "./globals.css";

import { getConfig } from "../wagmi";
import { Providers } from "./providers";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

export const metadata: Metadata = {
  title: "TapTato - Zero-Popup Potato Farming",
  description: "Farm potatoes with Base Account Sub Accounts - no popups!",
  openGraph: {
    title: "TapTato - Zero-Popup Potato Farming",
    description: "Farm potatoes with Base Account Sub Accounts - no popups!",
    images: [
      {
        url: "/thumbnail.png",
        width: 950,
        height: 1065,
        alt: "TapTato Game Screenshot",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TapTato - Zero-Popup Potato Farming",
    description: "Farm potatoes with Base Account Sub Accounts - no popups!",
    images: ["/thumbnail.png"],
  },
};

export default function RootLayout(props: { children: ReactNode }) {
  const initialState = cookieToInitialState(
    getConfig(),
    headers().get("cookie")
  );
  return (
    <html lang="en">
      <body className={`${vt323.variable} ${pressStart2P.variable}`}>
        <Providers initialState={initialState}>{props.children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
