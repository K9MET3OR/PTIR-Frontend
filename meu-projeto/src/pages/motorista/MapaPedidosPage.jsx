import { useState, useEffect } from "react";
import MapaBase from "../../components/MapaBase";
import { taxiService } from "../../services/taxiService";
import { PEDIDOS_MOCK, HISTORICO_VIAGENS, COR_ESTADO } from "../../services/mockData";
import styles from "./MapaPedidosPage.module.css";

// Coordenadas da Faculdade de Ciências de Lisboa (default)
const FCT_LISBOA = {
  lat: 38.7623,
  lon: -9.1585,
};

export default function MapaPedidosPage() {
  const [taxis, setTaxis] = useState([]);
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [pedidoAtivo,     setPedidoAtivo]     = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [tempoServico,    setTempoServico]    = useState("3:45"); // hh:mm
  const [ganhosDia,       setGanhosDia]       = useState(36.60);   // €

  // Carregar táxis da API ao montar o componente
  useEffect(() => {
    carregarTaxis();
  }, []);

  const carregarTaxis = async () => {
    setLoading(true);
    try {
      const response = await taxiService.list();
      const todosTaxis = response.data || [];
      
      // Mapear para o formato do mapa
      const taxisFormatados = todosTaxis.map(taxi => ({
        id: taxi.id,
        matricula: taxi.matricula,
        marca: taxi.marca || "",
        modelo: taxi.modelo || "",
        nivel_conforto: taxi.nivel_conforto || "Standard",
        estado: taxi.estado || "disponivel",
        motorista: "Driver", // placeholder, poderia ser vindo da API
        // Usar coordenadas default se não existirem
        lat: taxi.latitude ? parseFloat(taxi.latitude) : FCT_LISBOA.lat,
        lon: taxi.longitude ? parseFloat(taxi.longitude) : FCT_LISBOA.lon,
      }));
      
      setTaxis(taxisFormatados);
    } catch (error) {
      console.error("Erro ao carregar táxis:", error);
      setTaxis([]); // Usar lista vazia em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Converte táxis em markers para o mapa
  const taxisFiltrados = taxis.filter((t) =>
    filtro === "todos" ? true : t.estado === filtro
  );

  const markers = taxisFiltrados.map((t) => ({
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
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>Mapa da frota</h2>
          <p className={styles.subtitle}>Lisboa</p>
          <button
            onClick={carregarTaxis}
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "8px 12px",
              fontSize: "12px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Carregando..." : "🔄 Recarregar"}
          </button>
        </div>

        {/* Filtro */}
        <div className={styles.filtros}>
          {[
            { key: "todos",        label: "Todos" },
            { key: "disponivel",   label: "Disponíveis" },
            { key: "ocupado",      label: "Ocupados" },
            { key: "indisponivel", label: "Indisponíveis" },
          ].map((f) => (
            <button
              key={f.key}
              className={`${styles.filtroBtn} ${filtro === f.key ? styles.filtroAtivo : ""}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Legenda */}
        <div className={styles.legenda}>
          <div className={styles.legendaItem}>
            <div className={styles.legendaDot} style={{ background: "#16a34a" }} />
            <span>Disponível</span>
          </div>
          <div className={styles.legendaItem}>
            <div className={styles.legendaDot} style={{ background: "#ea580c" }} />
            <span>Indisponível</span>
          </div>
          <div className={styles.legendaItem}>
            <div className={styles.legendaDot} style={{ background: "#dc2626" }} />
            <span>Ocupado</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Lista de táxis */}
        <div className={styles.listTitle}>
          Táxis ({taxisFiltrados.length})
        </div>
        <div className={styles.lista}>
          {loading ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              A carregar táxis...
            </div>
          ) : taxisFiltrados.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              Nenhum táxi disponível
            </div>
          ) : (
            taxisFiltrados.map((t) => (
              <div
                key={t.id}
                className={`${styles.taxiItem} ${taxiSelecionado?.id === t.id ? styles.taxiItemAtivo : ""}`}
                onClick={() => setTaxiSelecionado(t)}
              >
                <div className={styles.taxiDot} style={{ background: COR_ESTADO[t.estado] }} />
                <div className={styles.taxiInfo}>
                  <span className={styles.taxiMatricula}>{t.matricula}</span>
                  <span className={styles.taxiMotorista}>{t.marca} {t.modelo}</span>
                </div>
                <span className={styles.taxiConforto}>{t.nivel_conforto}</span>
              </div>
            ))
          )}
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

        {/* Barra de Estado do Motorista */}
        <div className={styles.barraEstado}>
          <div className={styles.barraConteudo}>
            <button 
              className={`${styles.toggleButton} ${motoristaOnline ? styles.toggleOnline : styles.toggleOffline}`}
              onClick={toggleEstadoMotorista}
            >
              <span className={styles.toggleIndicador}></span>
            </button>
            
            <div className={styles.estadoInfo}>
              <div className={styles.estadoStatus}>
                <span className={`${styles.statusBadge} ${motoristaOnline ? styles.badgeOnline : styles.badgeOffline}`}>
                  {motoristaOnline ? "Online" : "Offline"}
                </span>
              </div>
              
              {motoristaOnline && (
                <div className={styles.veiculoInfo}>
                  <span className={styles.matricula}>{dadosMotorista.matricula}</span>
                  <span className={styles.veiculoSeparador}>•</span>
                  <span className={styles.veiculo}>{dadosMotorista.veiculo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}