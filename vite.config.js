import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 🚨 이 한 줄을 반드시 추가해주세요! (하얀 화면 해결 키포인트)
})