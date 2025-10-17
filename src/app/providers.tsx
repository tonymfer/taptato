"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { type State, WagmiProvider } from "wagmi";

import { getOnConfig } from "@/wagmi/onConfig";

/**
 * Always uses Sub Account ON mode for seamless transactions
 */
export function Providers(props: {
  children: ReactNode;
  initialState?: State;
}) {
  const [config] = useState(() => getOnConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider
      config={config}
      initialState={props.initialState}
      reconnectOnMount
    >
      <QueryClientProvider client={queryClient}>
        <Toaster position="bottom-right" />
        {props.children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
