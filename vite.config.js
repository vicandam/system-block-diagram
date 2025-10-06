import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    base: '/system-block-diagram/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
