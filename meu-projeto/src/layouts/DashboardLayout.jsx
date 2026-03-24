import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./DashboardLayout.module.css";

const NAV_ITEMS = [
  { to: "/gestor",             label: "Visão geral", icon: "⊞", end: true },
  { to: "/gestor/taxis",       label: "Táxis",       icon: "🚕" },
  { to: "/gestor/motoristas",  label: "Motoristas",  icon: "👤" },
  { to: "/gestor/relatorios",  label: "Relatórios",  icon: "📊" },
];

export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Iniciais do email para o avatar
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className={styles.root}>
      {/* ── SIDEBAR (desktop) ── */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}>H</div>
          <span className={styles.logoName}>Hermez</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.email}</span>
              <span className={styles.userRole}>{role}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            ← Sair
          </button>
        </div>
      </aside>

      {/* Overlay para fechar sidebar no mobile */}
      {mobileMenuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── MAIN ── */}
      <div className={styles.main}>
        {/* Topbar mobile */}
        <header className={styles.mobileTopbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div className={styles.mobileLogoRow}>
            <div className={styles.logoMark} style={{ width: 24, height: 24, fontSize: 11 }}>TG</div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>TaxiGest</span>
          </div>
          <div className={styles.avatar} style={{ width: 28, height: 28, fontSize: 11 }}>
            {initials}
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className={styles.content}>
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav className={styles.bottomNav}>
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.bottomNavItem} ${isActive ? styles.bottomNavActive : ""}`
              }
            >
              <span className={styles.bottomNavIcon}>{item.icon}</span>
              <span className={styles.bottomNavLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}