import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapaBase from "../../components/MapaBase";
import { useAuth } from "../../context/AuthContext";
import { TAXIS_MOCK, PEDIDOS_MOCK, HISTORICO_VIAGENS, COR_ESTADO } from "../../services/mockData";
import styles from "./MapaPedidosPage.module.css";

export default function MapaPedidosPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [pedidoAtivo,     setPedidoAtivo]     = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [tempoServico,    setTempoServico]    = useState("3:45"); // hh:mm
  const [ganhosDia,       setGanhosDia]       = useState(36.60);   // €

  // Simula aumento de tempo em serviço
  useEffect(() => {
    const timer = setInterval(() => {
      setTempoServico((prev) => {
        const [h, m] = prev.split(":").map(Number);
        const totalMinutos = h * 60 + m + 1;
        const newH = Math.floor(totalMinutos / 60);
        const newM = totalMinutos % 60;
        return `${newH}:${String(newM).padStart(2, "0")}`;
      });
    }, 60000); // Atualiza a cada minuto
    return () => clearInterval(timer);
  }, []);

  // Converte táxis em markers para o mapa
  const markers = TAXIS_MOCK.map((t) => ({
    ...t,
    label: t.matricula,
    color: COR_ESTADO[t.estado] ?? COR_ESTADO.offline,
  }));

  function handleMarkerClick(marker) {
    setTaxiSelecionado(marker);
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  function handleProfileToggle() {
    setProfileMenuOpen((value) => !value);
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className={styles.root}>
      {/* Painel lateral */}
      <aside className={styles.sidebar}>
       <div className={styles.brand}>
          <div className={styles.brandLogo}>H</div>
          <div>
            <div className={styles.brandName}>Hermez</div>
            <div className={styles.brandSub}>Dashboard</div>
          </div>
        </div>

        {/* Stats Header */}
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Ganhos hoje</div>
            <div className={styles.statValue}>{ganhosDia.toFixed(2)} €</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Tempo em serviço</div>
            <div className={styles.statValue}>{tempoServico}</div>
          </div>
        </div>

        {/* Pedidos Pendentes */}
        {PEDIDOS_MOCK.length > 0 && (
          <>
            <div className={styles.divider} />
            <div className={styles.sectionTitle}>Pedidos Pendentes</div>
            <div className={styles.lista}>
              {PEDIDOS_MOCK.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.pedidoItem} ${pedidoAtivo?.id === p.id ? styles.pedidoAtivo : ""}`}
                  onClick={() => setPedidoAtivo(pedidoAtivo?.id === p.id ? null : p)}
                >
                  <div className={styles.pedidoCliente}>{p.cliente}</div>
                  <div className={styles.pedidoRota}>
                    <span>{p.origem.label.split(",")[0]}</span>
                    <span className={styles.rotaArrow}>→</span>
                    <span>{p.destino.label.split(",")[0]}</span>
                  </div>
                  <div className={styles.pedidoMeta}>
                    {p.n_pessoas} pessoa{p.n_pessoas > 1 ? "s" : ""} · {p.nivel_conforto}
                  </div>
                  {pedidoAtivo?.id === p.id && (
                    <div className={styles.pedidoActions}>
                      <button className={styles.btnAceitar}>Aceitar</button>
                      <button className={styles.btnRejeitar}>Rejeitar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Histórico de Viagens */}
        {HISTORICO_VIAGENS.length > 0 && (
          <>
            <div className={styles.divider} />
            <div className={styles.sectionTitle}>Histórico de Viagens</div>
            <div className={styles.historicList}>
              {HISTORICO_VIAGENS.map((v) => (
                <div key={v.id} className={styles.historicoItem}>
                  <div className={styles.historicoHeader}>
                    <span className={styles.historicoCliente}>{v.cliente}</span>
                    <span className={styles.historicoGanho}>{v.ganho.toFixed(2)} €</span>
                  </div>
                  <div className={styles.historicoRota}>
                    <span>{v.origem}</span>
                    <span className={styles.rotaArrow}>→</span>
                    <span>{v.destino}</span>
                  </div>
                  <div className={styles.historicoMeta}>
                    <span>{v.duracao}</span>
                    <span className={styles.metaDot}>•</span>
                    <span>{v.distancia}</span>
                    <span className={styles.metaDot}>•</span>
                    <span>{v.hora}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Mapa */}
      <div className={styles.mapaWrap}>
        <MapaBase
          markers={markers}
          height="100%"
          onMarkerClick={handleMarkerClick}
        />

        {/* Profile Card */}
        <div className={styles.profileCardWrapper}>
          <button
            className={styles.profileBtn}
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

        {/* Popup do táxi selecionado */}
        {taxiSelecionado && (
          <div className={styles.popup}>
            <button className={styles.popupClose} onClick={() => setTaxiSelecionado(null)}>×</button>
            <div className={styles.popupMatricula}>{taxiSelecionado.matricula}</div>
            <div className={styles.popupRow}>
              <span className={styles.popupLabel}>Motorista</span>
              <span>{taxiSelecionado.motorista}</span>
            </div>
            <div className={styles.popupRow}>
              <span className={styles.popupLabel}>Estado</span>
              <span
                className={styles.popupEstado}
                style={{ color: COR_ESTADO[taxiSelecionado.estado] }}
              >
                {taxiSelecionado.estado.replace("_", " ")}
              </span>
            </div>
            <div className={styles.popupRow}>
              <span className={styles.popupLabel}>Conforto</span>
              <span>{taxiSelecionado.nivel_conforto}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}