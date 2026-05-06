import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppRoutes from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster theme="dark" position="top-right" richColors />
    </BrowserRouter>
  )
}
