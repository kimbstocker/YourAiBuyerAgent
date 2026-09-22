import { HashRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import HomePage from './pages/HomePage'
import ListingsPage from './pages/ListingsPage'
import { StubAgentRunner } from './adapters/agentRunner'
import { StubAuthProvider } from './adapters/auth'
import { LocalStorageConfigStore } from './lib/searchConfig'

// Adapters are created once here. Replacing the stubs with real services is
// the only change needed when a backend exists.
const runner = new StubAgentRunner()
const auth = new StubAuthProvider()
const store = new LocalStorageConfigStore()

export default function App() {
  return (
    <HashRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage runner={runner} auth={auth} store={store} />} />
        <Route path="/listings" element={<ListingsPage />} />
      </Routes>
    </HashRouter>
  )
}
