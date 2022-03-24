import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// https://vitejs.dev/config/
export default defineConfig({
    root: "workbench",
    plugins: [vue()],
    server: {
        port: 2504,
    },
})
