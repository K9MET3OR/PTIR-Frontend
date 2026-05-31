import { useState, useEffect } from "react";
import MapaBase from "../../components/MapaBase";
import {
  listarViagensPendentes,
  listarViagensAceitesMotorista,
  aceitarViagem,
} from "../../services/tripService";
import {
  terminarShift,
  obterShift,
  verificarTurnoAtivo,
  cancelarShift,
} from "../../services/shiftService";
import styles from "./MapaPedidosPage.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { geocodificar, calcularRota } from "../../services/geocodingService";

const FCT_LISBOA = {
  lat: 38.7623,
  lon: -9.1585,
};

function turnoEstaAtivoAgora(turno) {
  if (!turno) return false;

  const inicio = new Date(turno.start_date);
  const fim = new Date(turno.end_date);
  const agora = new Date();

  return turno.status_shift !== "inactive" && inicio <= agora && agora < fim;
}

export default function MapaPedidosPage() {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("pedidos");

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

  const [pedidoAtivo, setPedidoAtivo] = useState(null);

  const [viagensPendentes, setViagensPendentes] = useState([]);
  const [viagensMotorista, setViagensMotorista] = useState([]);
  const [loadingViagens, setLoadingViagens] = useState(true);
  const [erroViagens, setErroViagens] = useState("");
  const [carregandoId, setCarregandoId] = useState(null);
  const [viagensIgnoradas, setViagensIgnoradas] = useState([]);

  const [routePoints, setRoutePoints] = useState([]);
  const [pedidoCoords, setPedidoCoords] = useState(null);

  const [turnoAtivo, setTurnoAtivo] = useState(null);
  const [tempoRestanteTurno, setTempoRestanteTurno] = useState(0);
  const [loadingTurno, setLoadingTurno] = useState(true);
  const [turnosMotorista, setTurnosMotorista] = useState([]);

  useEffect(() => {
    carregarViagens();
  }, [user]);

  useEffect(() => {
    carregarTurnosMotorista();
  }, [user]);

  useEffect(() => {
    async function refreshTudo() {
      await carregarViagens();
      await carregarTurnoAtivo();
      await carregarTurnosMotorista();
    }

    const interval = setInterval(() => {
      refreshTudo();
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  async function carregarTurnoAtivo() {
    setLoadingTurno(true);
    let turno = null;
    let shiftId = localStorage.getItem("turno_id");

    if (shiftId) {
      try {
        const response = await obterShift(shiftId);
        turno = response.shift || response;
        if (!turno || !turno.id || !turnoEstaAtivoAgora(turno)) {
          turno = null;
          localStorage.removeItem("turno_id");
          localStorage.removeItem("turno_ativo");
        }
      } catch (error) {
        console.warn("Erro ao carregar turno ativo pelo ID armazenado:", error);
        localStorage.removeItem("turno_id");
        localStorage.removeItem("turno_ativo");
      }
    }

    if (!turno && user?.id) {
      try {
        const turnoEncontrado = await verificarTurnoAtivo(user.id);
        if (turnoEncontrado && turnoEstaAtivoAgora(turnoEncontrado)) {
          turno = turnoEncontrado;
          localStorage.setItem("turno_id", turno.id);
          localStorage.setItem("turno_ativo", "true");
        } else {
          localStorage.removeItem("turno_id");
          localStorage.removeItem("turno_ativo");
        }
      } catch (error) {
        console.warn("Erro ao verificar turno ativo do motorista:", error);
        turno = null;
      }
    }

    if (!turno) {
      setTurnoAtivo(null);
      setLoadingTurno(false);
      return;
    }

    setTurnoAtivo(turno);

    if (turno?.end_date || turno?.end) {
      const fim = new Date(turno.end_date || turno.end);
      setTempoRestanteTurno(Math.max(0, fim.getTime() - Date.now()));
    } else {
      setTempoRestanteTurno(0);
    }

    setLoadingTurno(false);
  }

  useEffect(() => {
    carregarTurnoAtivo();
  }, [user]);

  useEffect(() => {
    if (!turnoAtivo) {
      setTempoRestanteTurno(0);
      return;
    }

    function atualizaTempo() {
      const agora = new Date();
      const fim = new Date(turnoAtivo.end_date || turnoAtivo.end || turnoAtivo.fim);
      if (Number.isNaN(fim.getTime())) {
        setTempoRestanteTurno(0);
        return;
      }
      setTempoRestanteTurno(Math.max(0, fim.getTime() - agora.getTime()));
    }

    atualizaTempo();
    const interval = setInterval(atualizaTempo, 1000);
    return () => clearInterval(interval);
  }, [turnoAtivo]);

  function formatarTempo(ms) {
    const totalMs = Math.max(0, Number(ms) || 0);
    const totalSegundos = Math.floor(totalMs / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    if (horas === 0 && minutos === 0 && segundos === 0) return "0h 0m 0s";
    return `${horas}h ${minutos}m ${segundos}s`;
  }

  function handleAtivarTurno() {
    navigate("/motorista/turno");
  }

  const estaEmServico = Boolean(turnoAtivo);

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

  async function carregarTurnosMotorista() {
    if (!user?.id) {
      setTurnosMotorista([]);
      return;
    }

    try {
      const data = await fetch(`/api/shift/driver/${user.id}`).then(async (res) => {
        if (!res.ok) throw new Error("Erro ao carregar turnos");
        return res.json();
      });
      setTurnosMotorista(data.shifts || []);
    } catch (error) {
      console.error("Erro ao carregar turnos do motorista:", error);
      setTurnosMotorista([]);
    }
  }

  const handleAceitarViagem = async (tripId) => {
    if (!turnoAtivo) {
      setErroViagens("Só podes aceitar pedidos durante um turno ativo.");
      return;
    }

    try {
      setCarregandoId(tripId);
      setErroViagens("");
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

  async function handleCancelarTurno(shiftId) {
    if (!window.confirm("Tem a certeza que quer cancelar este turno?")) {
      return;
    }

    try {
      await cancelarShift(shiftId);
      await carregarTurnosMotorista();
      alert("Turno cancelado com sucesso");
    } catch (error) {
      alert(`Erro ao cancelar turno: ${error.message}`);
    }
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleTerminarTurno() {
    const shiftId = turnoAtivo?.id;
    if (!shiftId) {
      alert("Turno não encontrado");
      return;
    }

    if (!window.confirm("Tem a certeza que quer terminar o turno?")) {
      return;
    }

    try {
      await terminarShift(shiftId);
      localStorage.removeItem("turno_ativo");
      localStorage.removeItem("turno_id");
      setTurnoAtivo(null);
      setTempoRestanteTurno(0);
      alert("Turno terminado com sucesso");
      navigate("/motorista/mapa", { replace: true });
    } catch (error) {
      alert(`Erro ao terminar turno: ${error.message}`);
    }
  }

  function handleProfileToggle() {
    setProfileMenuOpen((value) => !value);
  }

  const pedidosVisiveis = viagensPendentes.filter(
    (p) => !viagensIgnoradas.includes(p.id)
  );

  const agora = new Date();

  const proximosTurnos = turnosMotorista
    .filter((turno) => {
      const inicio = new Date(turno.start_date);
      return turno.status_shift !== "inactive" && inicio > agora;
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const turnoAtualTexto = turnoAtivo?.taxi_matricula
    ? `${turnoAtivo.taxi_matricula} · ${turnoAtivo.taxi_marca} ${turnoAtivo.taxi_modelo}`
    : "Sem táxi associado";

  const markers = [
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
      : [
          {
            id: "default-centro",
            lon: FCT_LISBOA.lon,
            lat: FCT_LISBOA.lat,
            label: "Lisboa",
            color: "#7c3aed",
          },
        ]),
  ];

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <h2 className={styles.title}>Painel do Motorista</h2>
            <p className={styles.subtitle}>
              {user?.username || user?.name || "Motorista"} · Lisboa
            </p>
          </div>
        </div>

        <div className={styles.filterCard}>
          <div className={styles.sectionTitle}>Turno Atual</div>
          {loadingTurno ? (
            <p className={styles.subtitle}>A carregar turno...</p>
          ) : turnoAtivo ? (
            <>
              <div className={styles.turnoAtualLinha}>
                <strong>
                  {new Date(turnoAtivo.start_date).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -
                  {" "}
                  {new Date(turnoAtivo.end_date).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
              <div className={styles.turnoAtualLinha}>{turnoAtualTexto}</div>
            </>
          ) : (
            <p className={styles.subtitle}>Não tens nenhum turno ativo neste momento.</p>
          )}
        </div>

        {turnoAtivo && (
          <div className={styles.remainingTimeBannerSmall}>
            <span>Tempo restante</span>
            <strong>{formatarTempo(tempoRestanteTurno)}</strong>
          </div>
        )}

        <button
          type="button"
          className={`${styles.ativarTurnoBtn} ${estaEmServico ? styles.ativarTurnoBtnAtivo : ""}`}
          onClick={estaEmServico ? handleTerminarTurno : handleAtivarTurno}
        >
          {estaEmServico ? "Terminar turno" : "Iniciar turno"}
        </button>

        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${abaAtiva === "pedidos" ? styles.tabBtnAtiva : ""}`}
            onClick={() => setAbaAtiva("pedidos")}
          >
            Pedidos
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${abaAtiva === "turnos" ? styles.tabBtnAtiva : ""}`}
            onClick={() => setAbaAtiva("turnos")}
          >
            Turnos
          </button>
        </div>

        {abaAtiva === "pedidos" && (
          <>
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
          </>
        )}

        {abaAtiva === "turnos" && (
          <>
            <div className={styles.divider} />
            <div className={styles.sectionTitle}>Próximos Turnos</div>
            <div className={styles.lista}>
              {proximosTurnos.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                  Não tens próximos turnos agendados
                </div>
              ) : (
                proximosTurnos.map((turno) => (
                  <div key={turno.id} className={styles.historicoItem}>
                    <div className={styles.historicoHeader}>
                      <span className={styles.historicoCliente}>
                        {new Date(turno.start_date).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <div className={styles.historicoMeta}>
                      <span>
                        {new Date(turno.start_date).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -
                        {" "}
                        {new Date(turno.end_date).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className={styles.historicoRota}>
                      <span>
                        {turno.taxi_matricula
                          ? `${turno.taxi_matricula} · ${turno.taxi_marca} ${turno.taxi_modelo}`
                          : turno.taxi_id}
                      </span>
                    </div>

                    <div className={styles.turnoCardActions}>
                      <button
                        type="button"
                        className={styles.btnCancelarTurno}
                        onClick={() => handleCancelarTurno(turno.id)}
                      >
                        Cancelar turno
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>

      <div className={styles.mapaWrap}>
        <div className={styles.profileCardWrapper}>
          <button className={styles.profileBtn} onClick={handleProfileToggle}>
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

        <MapaBase
          markers={markers}
          routePoints={routePoints}
          height="100%"
          onMarkerClick={() => {}}
        />
      </div>
    </div>
  );
}