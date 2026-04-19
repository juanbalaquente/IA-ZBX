import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useApiStatus } from "./hooks/useApiStatus";
import AIQueriesPage from "./pages/AIQueriesPage";
import DashboardPage from "./pages/DashboardPage";
import HostsPage from "./pages/HostsPage";
import LinksPage from "./pages/LinksPage";
import LogsPage from "./pages/LogsPage";
import ProblemsPage from "./pages/ProblemsPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const apiStatus = useApiStatus();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-noc-surface text-slate-100">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1">
            <Header apiStatus={apiStatus} />
            <main className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard"
                  element={<DashboardPage apiStatus={apiStatus} />}
                />
                <Route path="/hosts" element={<HostsPage />} />
                <Route path="/ia" element={<AIQueriesPage />} />
                <Route path="/problems" element={<ProblemsPage />} />
                <Route path="/links" element={<LinksPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route
                  path="/settings"
                  element={<SettingsPage apiStatus={apiStatus} />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
