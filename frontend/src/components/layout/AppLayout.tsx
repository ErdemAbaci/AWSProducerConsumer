import { NavLink, Outlet } from "react-router-dom";
import { appConfig } from "../../config/env";
import { useAuth } from "../../context/AuthContext";

export function AppLayout() {
  const { logout, session } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img src="/app-mark.svg" alt="" className="brand-mark" />
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h1>{appConfig.appTitle}</h1>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink
            to="/jobs"
            end
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
          >
            Jobs
          </NavLink>
          <NavLink
            to="/jobs/create"
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
          >
            Create Job
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-label">Signed in as</p>
          <p className="sidebar-user">{session?.user.displayName}</p>
          <span className="mode-chip">
            {appConfig.authMode === "cognito" ? "Cognito" : "Manual token"}
          </span>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">AWS job management</p>
            <h2 className="topbar-title">Manage your jobs</h2>
          </div>

          <button type="button" className="button button-secondary" onClick={logout}>
            Logout
          </button>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
