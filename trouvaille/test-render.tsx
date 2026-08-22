import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { StatisticsPage } from './src/pages/StatisticsPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

const qc = new QueryClient()

const App = () => (
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <StatisticsPage />
    </BrowserRouter>
  </QueryClientProvider>
)

try {
  console.log("Rendering StatisticsPage...")
  renderToString(createElement(App))
  console.log("StatisticsPage OK")
} catch (e) {
  console.error("StatisticsPage ERROR:", e)
}
