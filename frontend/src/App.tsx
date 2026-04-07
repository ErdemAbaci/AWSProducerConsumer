import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingState } from "./components/LoadingState";
import { useAuth } from "./context/AuthContext";
import { CreateJobPage } from "./pages/CreateJobPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function HomeRedirect() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <LoadingState label="Loading dashboard..." fullscreen />;
  }

  return <Navigate to={isAuthenticated ? "/jobs" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/create" element={<CreateJobPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
