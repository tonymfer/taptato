import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";

/**
 * Wagmi config for Sub Account ON mode
 * - Sub account created automatically on connect
 * - All transactions use sub account (no popups after initial permission)
 * - Supports batch transactions via wallet_sendCalls
 */
export function getOnConfig() {
  return createConfig({
    chains: [baseSepolia],
    connectors: [
      baseAccount({
        appName: "TapTato",
        subAccounts: {
          creation: "on-connect", // Auto-create sub account
          defaultAccount: "sub", // Use sub account by default
        },
        paymasterUrls: {
          [baseSepolia.id]: process.env
            .NEXT_PUBLIC_PAYMASTER_SERVICE_URL as string,
        },
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(),
    },
  });
}
