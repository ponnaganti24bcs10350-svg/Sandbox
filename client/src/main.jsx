import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import AppRouter from './app/AppRouter.jsx'
import { queryClient } from './app/queryClient.js'

createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
        <AppRouter />
    </QueryClientProvider>
)
