import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./DashboardLayout.module.css";

const NAV_ITEMS_GESTOR = [
  { to: "/gestor",             label: "Visão geral", icon: "⊞", end: true },
  { to: "/gestor/taxis",       label: "Táxis",       icon: "🚕" },
  { to: "/gestor/motoristas",  label: "Motoristas",  icon: "👤" },
  { to: "/gestor/relatorios",  label: "Relatórios",  icon: "📊" },
];

const NAV_ITEMS_MOTORISTA = [
  { to: "/motorista/turno",    label: "Iniciar Turno", icon: "⏰", end: true },
  { to: "/motorista/mapa",     label: "Mapa",          icon: "🗺️" },
  { to: "/motorista/pedidos",  label: "Pedidos",       icon: "📋" },
  { to: "/motorista/viagem",   label: "Viagens",       icon: "�️" },
  { to: "/motorista/reabastecimento", label: "Reabastecimento", icon: "⛽" },
  { to: "/motorista/faturas",  label: "Faturas",       icon: "📄" },
];

export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Selecionar itens de navegação baseado no role
  const NAV_ITEMS = role === "motorista" ? NAV_ITEMS_MOTORISTA : NAV_ITEMS_GESTOR;

  async function handleLogout() {
    setProfileMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  function handleProfileToggle() {
    setProfileMenuOpen((value) => !value);
  }

  // Iniciais do email para o avatar
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const showSidebar = role !== "cliente";

  return (
    <div className={styles.root}>
      {/* ── SIDEBAR (desktop) ── */}
      {showSidebar && (
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
      )}

      {/* Overlay para fechar sidebar no mobile */}
      {showSidebar && mobileMenuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── MAIN ── */}
      <div className={styles.main}>
        {role === "cliente" && (
          <header className={styles.clientTopbar}>
            <div className={styles.clientLogoRow}>
              <div className={styles.logoMark} style={{ width: 28, height: 28, fontSize: 12 }}>H</div>
              <span className={styles.clientTitle}>Hermez</span>
            </div>
            <div className={styles.profileMenuWrapper}>
              <button
                className={styles.profileBtn}
                aria-label="Perfil"
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
                onClick={handleProfileToggle}
              >
                {initials}
              </button>
              {profileMenuOpen && (
                <div className={styles.profileMenu}>
                  <button className={styles.profileMenuItem} type="button">
                    Editar perfil
                  </button>
                  <button className={styles.profileMenuItem} type="button" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </header>
        )}
        {/* Topbar mobile */}
        <header className={styles.mobileTopbar}>
          {showSidebar && (
            <button
              className={styles.menuBtn}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              ☰
            </button>
          )}
          <div className={styles.mobileLogoRow}>
            <div className={styles.logoMark} style={{ width: 24, height: 24, fontSize: 11 }}>H</div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Hermez</span>
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
        {showSidebar && (
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
        )}
      </div>
    </div>
  );
}