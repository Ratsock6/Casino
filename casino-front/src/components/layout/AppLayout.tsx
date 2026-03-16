import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="casino-shell">
      <Sidebar />
      <div className="casino-main">
        <Header />
        <main className="casino-content">
          <div className="page-width">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}