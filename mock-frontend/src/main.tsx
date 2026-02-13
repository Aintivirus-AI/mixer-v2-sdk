import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { MixerProviderWithWagmi } from "@aintivirus-ai/mixer-sdk";
import { config } from "./wagmi";
import { mixerSdkConfig } from "./config";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MixerProviderWithWagmi config={mixerSdkConfig}>
          <App />
        </MixerProviderWithWagmi>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
