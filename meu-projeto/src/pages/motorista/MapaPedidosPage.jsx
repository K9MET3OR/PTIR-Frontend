import { useState, useEffect } from "react";
import MapaBase from "../../components/MapaBase";
import { taxiService } from "../../services/taxiService";
import { listarViagensPendentes, listarViagensAceitesMotorista, aceitarViagem } from "../../services/tripService";
import { terminarShift } from "../../services/shiftService";
import { COR_ESTADO } from "../../services/mockData";
import styles from "./MapaPedidosPage.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { geocodificar, calcularRota } from "../../services/geocodingService";

// Coordenadas da Faculdade de Ciências de Lisboa (default)
const FCT_LISBOA = {
  lat: 38.7623,
  lon: -9.1585,
};

export default function MapaPedidosPage() {

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const initials = (() => {
    const source = user?.name || user?.username || user?.email || "";
    const normalized = source.trim();
    if (!normalized) return "??";

    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }

    return normalized.slice(0, 2).toUpperCase();
  })();

  const [taxis, setTaxis] = useState([]);
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [pedidoAtivo, setPedidoAtivo] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  const [viagensPendentes, setViagensPendentes] = useState([]);
  const [viagensMotorista, setViagensMotorista] = useState([]);
  const [loadingViagens, setLoadingViagens] = useState(true);
  const [erroViagens, setErroViagens] = useState("");
  const [carregandoId, setCarregandoId] = useState(null);
  const [viagensIgnoradas, setViagensIgnoradas] = useState([]);

  const [routePoints, setRoutePoints] = useState([]);
  const [pedidoCoords, setPedidoCoords] = useState(null);

  // Carregar táxis da API ao montar o componente
  useEffect(() => {
    carregarTaxis();
  }, []);

  // Carregar viagens da API ao montar o componente
  useEffect(() => {
    carregarViagens();
  }, [user]);

  // Carregar rota do pedido ativo
  useEffect(() => {
    async function carregarRotaPedido() {
      if (!pedidoAtivo) {
        setRoutePoints([]);
        setPedidoCoords(null);
        return;
      }

      try {
        const origemResultados = await geocodificar(pedidoAtivo.start_location);
        const destinoResultados = await geocodificar(pedidoAtivo.end_location);

        if (!origemResultados?.length || !destinoResultados?.length) {
          setRoutePoints([]);
          setPedidoCoords(null);
          return;
        }

        const origem = {
          lon: parseFloat(origemResultados[0].lon),
          lat: parseFloat(origemResultados[0].lat),
        };

        const destino = {
          lon: parseFloat(destinoResultados[0].lon),
          lat: parseFloat(destinoResultados[0].lat),
        };

        setPedidoCoords({ origem, destino });

        const rota = await calcularRota(origem, destino);

        if (rota && rota.length) {
          setRoutePoints(rota);
        } else {
          setRoutePoints([
            [origem.lon, origem.lat],
            [destino.lon, destino.lat],
          ]);
        }
      } catch (error) {
        console.error("Erro ao carregar rota do pedido:", error);
        setRoutePoints([]);
        setPedidoCoords(null);
      }
    }

    carregarRotaPedido();
  }, [pedidoAtivo]);

  const carregarTaxis = async () => {
    setLoading(true);
    try {
      const response = await taxiService.list();
      const todosTaxis = response.data || [];

      // Mapear para o formato do mapa
      const taxisFormatados = todosTaxis.map((taxi) => ({
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

  async function carregarViagens() {
    setLoadingViagens(true);
    setErroViagens("");

    try {
      const pendentes = await listarViagensPendentes();
      setViagensPendentes(pendentes.trips || []);

      if (user?.id) {
        const minhas = await listarViagensAceitesMotorista(user.id);
        setViagensMotorista(minhas.trips || []);
      } else {
        setViagensMotorista([]);
      }
    } catch (error) {
      console.error("Erro ao carregar viagens no mapa:", error);
      setErroViagens(error.message || "Erro ao carregar viagens.");
    } finally {
      setLoadingViagens(false);
    }
  }

  const handleAceitarViagem = async (tripId) => {
    try {
      setCarregandoId(tripId);
      await aceitarViagem(tripId, user.id);
      setPedidoAtivo(null);
      await carregarViagens();
    } catch (error) {
      console.error("Erro ao aceitar viagem:", error);
      setErroViagens(error.message || "Erro ao aceitar viagem.");
    } finally {
      setCarregandoId(null);
    }
  };

  const handleIgnorarViagem = (tripId) => {
    setViagensIgnoradas((prev) => [...prev, tripId]);
    if (pedidoAtivo?.id === tripId) {
      setPedidoAtivo(null);
    }
  };

  function handleMarkerClick(marker) {
    setTaxiSelecionado(marker);
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleTerminarTurno() {
    const shiftId = localStorage.getItem('turno_id');
    if (!shiftId) {
      alert('Turno não encontrado');
      return;
    }

    if (!window.confirm('Tem a certeza que quer terminar o turno?')) {
      return;
    }

    try {
      await terminarShift(shiftId);
      localStorage.removeItem('turno_ativo');
      localStorage.removeItem('turno_id');
      alert('Turno terminado com sucesso');
      navigate("/motorista/turno", { replace: true });
    } catch (error) {
      alert(`Erro ao terminar turno: ${error.message}`);
    }
  }

  function handleProfileToggle() {
    setProfileMenuOpen((value) => !value);
  }

  function handleRecarregar() {
    carregarTaxis();
    carregarViagens();
  }

  const markers = [
    ...taxisFiltrados.map((t) => ({
      ...t,
      label: t.matricula,
      color: COR_ESTADO[t.estado] ?? COR_ESTADO.offline,
    })),
    ...(pedidoCoords
      ? [
          {
            id: "origem-pedido",
            lon: pedidoCoords.origem.lon,
            lat: pedidoCoords.origem.lat,
            label: "Origem",
            color: "#a855f7",
          },
          {
            id: "destino-pedido",
            lon: pedidoCoords.destino.lon,
            lat: pedidoCoords.destino.lat,
            label: "Destino",
            color: "#c084fc",
          },
        ]
      : []),
  ];

  const pedidosVisiveis = viagensPendentes.filter(
    (p) => !viagensIgnoradas.includes(p.id)
  );

  return (
    <div className={styles.root}>
      {/* Painel lateral */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.headerTop}>
            <div>
              <h2 className={styles.title}>Mapa da frota</h2>
              <p className={styles.subtitle}>Lisboa</p>
            </div>

            <button
              onClick={handleRecarregar}
              disabled={loading || loadingViagens}
              className={styles.refreshBtn}
            >
              {loading || loadingViagens ? "A carregar..." : "↻ Recarregar"}
            </button>
          </div>
        </div>

        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Táxis</span>
            <span className={styles.statValue}>{taxis.length}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Pedidos</span>
            <span className={styles.statValue}>{pedidosVisiveis.length}</span>
          </div>
        </div>

        <div className={styles.filterCard}>
          <div className={styles.sectionTitle}>Filtrar táxis</div>

          <div className={styles.filtros}>
            {[
              { key: "todos", label: "Todos" },
              { key: "disponivel", label: "Disponíveis" },
              { key: "ocupado", label: "Ocupados" },
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
        <div className={styles.divider} />
        <div className={styles.sectionTitle}>Pedidos Pendentes</div>
        <div className={styles.lista}>
          {loadingViagens ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              A carregar pedidos...
            </div>
          ) : erroViagens ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#dc2626" }}>
              {erroViagens}
            </div>
          ) : pedidosVisiveis.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              Não há pedidos pendentes
            </div>
          ) : (
            pedidosVisiveis.map((p) => (
              <div
                key={p.id}
                className={`${styles.pedidoItem} ${pedidoAtivo?.id === p.id ? styles.pedidoAtivo : ""}`}
                onClick={() => setPedidoAtivo(pedidoAtivo?.id === p.id ? null : p)}
              >
                <div className={styles.pedidoCliente}>Cliente</div>
                <div className={styles.pedidoRota}>
                  <span>{p.start_location}</span>
                  <span className={styles.rotaArrow}>→</span>
                  <span>{p.end_location}</span>
                </div>
                <div className={styles.pedidoMeta}>
                  {p.n_people} pessoa{p.n_people > 1 ? "s" : ""} · {p.nivel_conforto}
                </div>
                {pedidoAtivo?.id === p.id && (
                  <div className={styles.pedidoActions}>
                    <button
                      className={styles.btnRejeitar}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIgnorarViagem(p.id);
                      }}
                      disabled={carregandoId === p.id}
                    >
                      Ignorar
                    </button>

                    <button
                      className={styles.btnAceitar}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAceitarViagem(p.id);
                      }}
                      disabled={carregandoId === p.id}
                    >
                      {carregandoId === p.id ? "A processar..." : "Aceitar"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Histórico de Viagens */}
        <div className={styles.divider} />
        <div className={styles.sectionTitle}>Histórico de Viagens</div>
        <div className={styles.historicList}>
          {loadingViagens ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              A carregar histórico...
            </div>
          ) : viagensMotorista.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
              Ainda não tens viagens aceites
            </div>
          ) : (
            viagensMotorista.map((v) => (
              <div key={v.id} className={styles.historicoItem}>
                <div className={styles.historicoHeader}>
                  <span className={styles.historicoCliente}>Viagem</span>
                  <span className={styles.historicoGanho}>
                    {v.price ? `${Number(v.price).toFixed(2)} €` : "-"}
                  </span>
                </div>
                <div className={styles.historicoRota}>
                  <span>{v.start_location}</span>
                  <span className={styles.rotaArrow}>→</span>
                  <span>{v.end_location}</span>
                </div>
                <div className={styles.historicoMeta}>
                  <span>{v.n_kms ? `${v.n_kms} km` : "-"}</span>
                  <span className={styles.metaDot}>•</span>
                  <span>{v.status_trip}</span>
                  <span className={styles.metaDot}>•</span>
                  <span>
                    {v.start_date
                      ? new Date(v.start_date).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Mapa */}
      <div className={styles.mapaWrap}>
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
              <button className={styles.profileMenuItem} type="button" onClick={handleTerminarTurno}>
                🛑 Terminar Turno
              </button>
              <button className={styles.profileMenuItem} type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
        <MapaBase
          markers={markers}
          routePoints={routePoints}
          height="100%"
          onMarkerClick={handleMarkerClick}
        />
      </div>
    </div>
  );
}