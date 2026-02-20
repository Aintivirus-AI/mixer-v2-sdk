import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var sdkRoot = path.resolve(__dirname, "..");
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: "@", replacement: path.resolve(__dirname, "./src") },
            // Single alias to SDK main entry; all imports use @aintivirus-ai/mixer-sdk (no /hooks subpath)
            {
                find: "@aintivirus-ai/mixer-sdk",
                replacement: path.join(sdkRoot, "src", "index.ts"),
            },
        ],
    },
    server: {
        port: 5173,
    },
});
