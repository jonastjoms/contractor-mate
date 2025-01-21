import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { AppLayout } from "@/components/layout/app-layout"
import Auth from "@/pages/Auth"
import Index from "@/pages/Index"
import Project from "@/pages/Project"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/project/:id" element={<Project />} />
          </Routes>
        </AppLayout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App