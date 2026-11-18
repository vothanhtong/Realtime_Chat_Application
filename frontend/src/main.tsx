import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

// Bản cũ persist danh sách hội thoại vào localStorage — giờ là cache của TanStack Query
try {
  localStorage.removeItem('chat-storage')
} catch {
  // storage bị chặn (private mode) — bỏ qua
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
