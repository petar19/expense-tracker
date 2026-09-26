/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  base: '/house-ops/',
  plugins: [svelte()],
  test: {
    environment: 'node',
  },
})
