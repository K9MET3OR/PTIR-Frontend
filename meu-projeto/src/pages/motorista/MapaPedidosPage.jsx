import { useState, useEffect, useRef, useMemo } from "react";
import MapaBase from "../../components/MapaBase";

import {
  listarViagensPendentes,
  listarViagensAceitesMotorista,
  listarViagensFinalizadasMotorista,
  aceitarViagem,
  iniciarViagem,
  finalizarViagem,
  cancelarEsperaMotorista,
} from "../../services/tripService";

import {
  terminarShift,
  obterShift,
  verificarTurnoAtivo,
  cancelarShift,
} from "../../services/shiftService";

import { taxiService } from "../../services/taxiService";

import styles from "./MapaPedidosPage.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { geocodificar, calcularRota } from "../../services/geocodingService";

const FCT_LISBOA = {
  lat: 38.756734,
  lon: -9.155412,
};

function numeroOuNull(valor) {
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarConforto(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto === "luxuoso" || texto === "luxo") {
    return "luxuoso";
  }

  return "basico";
}

function extrairListaTaxis(response) {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.taxis)) return payload.taxis;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function extrairTaxiId(registo) {
  if (!registo) return null;

  if (registo.taxi_id) return registo.taxi_id;
  if (registo.id_taxi) return registo.id_taxi;
  if (registo.taxiId) return registo.taxiId;

  if (typeof registo.taxi === "string") return registo.taxi;

  if (registo.taxi?.id) return registo.taxi.id;
  if (registo.taxi?.id_taxi) return registo.taxi.id_taxi;

  return null;
}

function turnoEstaAtivoAgora(turno) {
  if (!turno) return false;

  const inicio = new Date(turno.start_date);
  const fim = new Date(turno.end_date);
  const agora = new Date();

  return turno.status_shift !== "inactive" && inicio <= agora && agora < fim;
}

function formatarTempo(ms) {
  const totalMs = Math.max(0, Number(ms) || 0);
  const totalSegundos = Math.floor(totalMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  if (horas === 0 && minutos === 0 && segundos === 0) return "0h 0m 0s";
  return `${horas}h ${minutos}m ${segundos}s`;
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const toRad = (valor) => (valor * Math.PI) / 180;

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatarDistancia(km) {
  if (km == null || Number.isNaN(Number(km))) return "A calcular...";
  const valor = Number(km);

  if (valor < 1) {
    return `${Math.round(valor * 1000)} m`;
  }

  return `${valor.toFixed(1)} km`;
}

function estimarMinutosPorDistanciaKm(distanciaKm) {
  if (distanciaKm == null || Number.isNaN(Number(distanciaKm))) return null;

  const velocidadeMediaKmH = 40;
  return Math.max(1, Math.round((Number(distanciaKm) / velocidadeMediaKmH) * 60));
}

function formatarCountdown(segundos) {
  const total = Math.max(0, Number(segundos) || 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatarHoraViagem(data) {
  if (!data) return "-";

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "-";
  }

  return dataObj.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarIntervaloViagem(startDate, endDate) {
  const horaInicio = formatarHoraViagem(startDate);
  const horaFim = formatarHoraViagem(endDate);

  if (horaInicio === "-" && horaFim === "-") {
    return "-";
  }

  if (horaInicio !== "-" && horaFim === "-") {
    return `${horaInicio} - em curso`;
  }

  if (horaInicio === "-" && horaFim !== "-") {
    return `Fim: ${horaFim}`;
  }

  return `${horaInicio} - ${horaFim}`;
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

  const [pedidoSelecionadoMapa, setPedidoSelecionadoMapa] = useState(null);

  const [viagensPendentes, setViagensPendentes] = useState([]);
  const [viagensMotorista, setViagensMotorista] = useState([]);
  const [historicoViagens, setHistoricoViagens] = useState([]);
  const [loadingViagens, setLoadingViagens] = useState(true);
  const [erroViagens, setErroViagens] = useState("");
  const [carregandoId, setCarregandoId] = useState(null);
  const [viagensIgnoradas, setViagensIgnoradas] = useState([]);
  const [mensagemPainel, setMensagemPainel] = useState("");

  const [routePoints, setRoutePoints] = useState([]);
  const [pedidoCoords, setPedidoCoords] = useState(null);
  const [mapView, setMapView] = useState({
    center: [FCT_LISBOA.lon, FCT_LISBOA.lat],
    zoom: 12,
  });
  const [taxis, setTaxis] = useState([]);

  const [turnoAtivo, setTurnoAtivo] = useState(null);
  const [tempoRestanteTurno, setTempoRestanteTurno] = useState(0);
  const [tempoAteProximoTurno, setTempoAteProximoTurno] = useState(0);
  const [pedidosPendentesComDistancia, setPedidosPendentesComDistancia] = useState([]);

  const [segundosRestantesConfirmacao, setSegundosRestantesConfirmacao] = useState(60);
  const [loadingTurno, setLoadingTurno] = useState(true);
  const [turnosMotorista, setTurnosMotorista] = useState([]);

  const prevAguardaCountRef = useRef(0);
  const coordsCacheRef = useRef({});

  useEffect(() => {
    carregarViagens();
  }, [user]);

  useEffect(() => {
    carregarTurnosMotorista();
  }, [user]);

  async function carregarTaxis() {
    try {
      const response = await taxiService.list();
      const todosTaxis = extrairListaTaxis(response);

      const taxisFormatados = todosTaxis.map((taxi) => {
        const lat = numeroOuNull(taxi.latitude ?? taxi.lat);
        const lon = numeroOuNull(taxi.longitude ?? taxi.lon ?? taxi.lng);

        return {
          id: taxi.id || taxi.id_taxi,
          id_taxi: taxi.id_taxi || taxi.id,
          matricula: taxi.matricula,
          lon,
          lat,
          temLocalizacaoReal: lat !== null && lon !== null,
          estado: taxi.estado || "disponivel",
          nivel_conforto: taxi.nivel_conforto || "Básico",
          marca: taxi.marca || "",
          modelo: taxi.modelo || "",
        };
      });

      setTaxis(taxisFormatados);
    } catch (error) {
      console.error("Erro ao carregar táxis:", error);
      setTaxis([]);
    }
  }

  useEffect(() => {
    carregarTaxis();
  }, []);

  useEffect(() => {
    async function refreshTudo() {
      await carregarViagens();
      await carregarTurnoAtivo();
      await carregarTurnosMotorista();
      await carregarTaxis();
    }

    const interval = setInterval(() => {
      refreshTudo();
    }, 5000);

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

  function handleAtivarTurno() {
    navigate("/motorista/turno");
  }

  function handleProfileToggle() {
    setProfileMenuOpen((value) => !value);
  }

  function handleIrParaReabastecimento() {
    navigate("/motorista/reabastecimento");
  }

  async function obterCoordsLocal(local) {
    if (!local) return null;

    const key = local.trim().toLowerCase();
    if (coordsCacheRef.current[key]) {
      return coordsCacheRef.current[key];
    }

    const resultados = await geocodificar(local);
    if (!Array.isArray(resultados) || !resultados.length) return null;

    const coords = {
      lon: parseFloat(resultados[0].lon),
      lat: parseFloat(resultados[0].lat),
    };

    coordsCacheRef.current[key] = coords;
    return coords;
  }

  async function carregarViagens() {
    setLoadingViagens(true);
    setErroViagens("");

    try {
      const pendentes = await listarViagensPendentes(user?.id);
      setViagensPendentes(pendentes.trips || []);

      if (user?.id) {
        const minhas = await listarViagensAceitesMotorista(user.id);
        setViagensMotorista(minhas.trips || []);

        const finalizadas = await listarViagensFinalizadasMotorista(user.id);

        const historicoOrdenado = [...(finalizadas.trips || [])].sort((a, b) => {
          const dataA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dataB = b.start_date ? new Date(b.start_date).getTime() : 0;

          return dataB - dataA;
        });

        setHistoricoViagens(historicoOrdenado);
      } else {
        setViagensMotorista([]);
        setHistoricoViagens([]);
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
    const podeAceitar = turnoEstaAtivoAgora(turnoAtivo);

    if (!podeAceitar) {
      setErroViagens("Só podes aceitar pedidos durante um turno ativo.");
      return;
    }

    try {
      setCarregandoId(tripId);
      setErroViagens("");
      setMensagemPainel("");
      await aceitarViagem(tripId, user.id);
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
    if (pedidoSelecionadoMapa?.id === tripId) {
      setPedidoSelecionadoMapa(null);
    }
  };

  async function handleCancelarEspera(tripId, silencioso = false) {
    try {
      setCarregandoId(tripId);
      setErroViagens("");

      await cancelarEsperaMotorista(tripId);
      await carregarViagens();

      if (!silencioso) {
        setMensagemPainel("A espera pela resposta do cliente foi cancelada.");
      } else {
        setMensagemPainel("O cliente não respondeu a tempo. O pedido foi cancelado.");
      }
    } catch (error) {
      console.error("Erro ao cancelar espera do cliente:", error);
      setErroViagens(error.message || "Erro ao cancelar espera do cliente.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function handleIniciarViagem(tripId) {
    try {
      setCarregandoId(tripId);
      setErroViagens("");
      await iniciarViagem(tripId);
      await carregarViagens();
    } catch (error) {
      console.error("Erro ao iniciar viagem:", error);
      setErroViagens(error.message || "Erro ao iniciar viagem.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function handleFinalizarViagem(tripId) {
    if (!window.confirm("Tem a certeza que quer terminar esta viagem?")) {
      return;
    }

    try {
      setCarregandoId(tripId);
      setErroViagens("");
      await finalizarViagem(tripId);
      await carregarViagens();
    } catch (error) {
      console.error("Erro ao finalizar viagem:", error);
      setErroViagens(error.message || "Erro ao finalizar viagem.");
    } finally {
      setCarregandoId(null);
    }
  }

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
      setMensagemPainel("");
      alert("Turno terminado com sucesso");
      navigate("/motorista/mapa", { replace: true });
    } catch (error) {
      alert(`Erro ao terminar turno: ${error.message}`);
    }
  }

  function obterTaxiAssociadoAoTurno() {
    if (!turnoAtivo) return null;

    const taxiIdTurno = extrairTaxiId(turnoAtivo);

    const matriculaTurno =
      valorMatriculaValido(turnoAtivo?.taxi_matricula) ||
      valorMatriculaValido(turnoAtivo?.taxi?.matricula) ||
      valorMatriculaValido(turnoAtivo?.matricula) ||
      null;

    const taxiEncontrado =
      taxis.find(
        (taxi) =>
          taxiIdTurno &&
          [taxi.id, taxi.id_taxi].some(
            (id) => id && String(id) === String(taxiIdTurno)
          )
      ) ||
      taxis.find(
        (taxi) =>
          matriculaTurno &&
          taxi.matricula &&
          String(taxi.matricula).toLowerCase() ===
            String(matriculaTurno).toLowerCase()
      ) ||
      null;

    return taxiEncontrado;
  }

  function obterNivelConfortoTaxiTurno() {
    const taxiTurno = obterTaxiAssociadoAoTurno();

    return normalizarConforto(
      taxiTurno?.nivel_conforto ||
        turnoAtivo?.taxi_nivel_conforto ||
        turnoAtivo?.nivel_conforto ||
        turnoAtivo?.taxi?.nivel_conforto ||
        "Básico"
    );
  }

  const pedidosPendentes = useMemo(() => {
    if (!turnoAtivo) return [];

    const nivelConfortoTaxiTurno = obterNivelConfortoTaxiTurno();

    return viagensPendentes.filter((p) => {
      const pedidoIgnorado = viagensIgnoradas.includes(p.id);
      if (pedidoIgnorado) return false;

      const nivelConfortoPedido = normalizarConforto(p.nivel_conforto);

      return nivelConfortoPedido === nivelConfortoTaxiTurno;
    });
  }, [turnoAtivo, viagensPendentes, viagensIgnoradas, taxis]);

  useEffect(() => {
    let cancelled = false;

    async function enriquecerPedidosComDistancia() {
      if (!turnoAtivo || pedidosPendentes.length === 0) {
        setPedidosPendentesComDistancia([]);
        return;
      }

      const taxiBaseAtual = obterTaxiBaseAtual();
      const taxiLat = taxiBaseAtual.lat;
      const taxiLon = taxiBaseAtual.lon;
      const tempoRestanteMin = Math.floor((tempoRestanteTurno || 0) / 1000 / 60);

      const pedidosCalculados = await Promise.all(
        pedidosPendentes.map(async (pedido) => {
          try {
            const origem = await obterCoordsLocal(pedido.start_location);
            const destino = await obterCoordsLocal(pedido.end_location);

            if (!origem || !destino) {
              return {
                ...pedido,
                distancia_motorista_km: null,
                distancia_viagem_km: null,
                tempo_ate_origem_min: null,
                tempo_viagem_min: null,
                tempo_total_estimado_min: null,
              };
            }

            const distanciaMotoristaKm = calcularDistanciaKm(
              taxiLat,
              taxiLon,
              origem.lat,
              origem.lon
            );

            const distanciaViagemKm = calcularDistanciaKm(
              origem.lat,
              origem.lon,
              destino.lat,
              destino.lon
            );

            const tempoAteOrigemMin = estimarMinutosPorDistanciaKm(distanciaMotoristaKm);
            const tempoViagemMin = estimarMinutosPorDistanciaKm(distanciaViagemKm);

            return {
              ...pedido,
              distancia_motorista_km: distanciaMotoristaKm,
              distancia_viagem_km: distanciaViagemKm,
              tempo_ate_origem_min: tempoAteOrigemMin,
              tempo_viagem_min: tempoViagemMin,
              tempo_total_estimado_min:
                tempoAteOrigemMin != null && tempoViagemMin != null
                  ? tempoAteOrigemMin + tempoViagemMin
                  : null,
            };
          } catch {
            return {
              ...pedido,
              distancia_motorista_km: null,
              distancia_viagem_km: null,
              tempo_ate_origem_min: null,
              tempo_viagem_min: null,
              tempo_total_estimado_min: null,
            };
          }
        })
      );

      const pedidosFiltrados = pedidosCalculados.filter((pedido) => {
        if (pedido.tempo_total_estimado_min == null) return false;
        return pedido.tempo_total_estimado_min <= tempoRestanteMin;
      });

      if (!cancelled) {
        const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) => {
          const distanciaA = a.distancia_motorista_km ?? Number.POSITIVE_INFINITY;
          const distanciaB = b.distancia_motorista_km ?? Number.POSITIVE_INFINITY;
          return distanciaA - distanciaB;
        });

        setPedidosPendentesComDistancia(pedidosOrdenados);
      }
    }

    enriquecerPedidosComDistancia();

    return () => {
      cancelled = true;
    };
  }, [turnoAtivo, pedidosPendentes, tempoRestanteTurno, taxis]);

  const pedidosAguardaConfirmacao = viagensMotorista.filter(
    (trip) => trip.status_trip === "driver_accepted"
  );

  const viagemAtiva = viagensMotorista.find(
    (trip) =>
      trip.status_trip === "client_confirmed" ||
      trip.status_trip === "in_progress"
  );

  const viagemAguardarPagamento = viagensMotorista.find(
    (trip) => trip.status_trip === "awaiting_payment"
  );

  const todasViagensVisiveis = useMemo(
    () => [
      ...pedidosPendentes,
      ...pedidosAguardaConfirmacao,
      ...(viagemAtiva ? [viagemAtiva] : []),
      ...(viagemAguardarPagamento ? [viagemAguardarPagamento] : []),
      ...historicoViagens,
    ],
    [
      pedidosPendentes,
      pedidosAguardaConfirmacao,
      viagemAtiva,
      viagemAguardarPagamento,
      historicoViagens,
    ]
  );

  useEffect(() => {
    const prevCount = prevAguardaCountRef.current;
    const currentCount = pedidosAguardaConfirmacao.length;

    if (prevCount > 0 && currentCount === 0 && !viagemAtiva) {
      setMensagemPainel("O cliente rejeitou a viagem.");
    }

    if (currentCount > 0 || viagemAtiva) {
      setMensagemPainel("");
    }

    prevAguardaCountRef.current = currentCount;
  }, [pedidosAguardaConfirmacao.length, viagemAtiva]);

  const temPedidoEmCurso =
    pedidosAguardaConfirmacao.length > 0 ||
    Boolean(viagemAtiva) ||
    Boolean(viagemAguardarPagamento);

  useEffect(() => {
    if (temPedidoEmCurso && abaAtiva !== "pedidos") {
      setAbaAtiva("pedidos");
    }
  }, [temPedidoEmCurso, abaAtiva]);

  useEffect(() => {
    const tripId = pedidosAguardaConfirmacao[0]?.id;

    if (!tripId) {
      setSegundosRestantesConfirmacao(20);
      return;
    }

    setSegundosRestantesConfirmacao((prev) => (prev > 0 && prev <= 20 ? prev : 20));

    const interval = setInterval(() => {
      setSegundosRestantesConfirmacao((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pedidosAguardaConfirmacao[0]?.id]);

  useEffect(() => {
    if (pedidosAguardaConfirmacao.length > 0) {
      setPedidoSelecionadoMapa(pedidosAguardaConfirmacao[0]);
      return;
    }

    if (viagemAtiva) {
      setPedidoSelecionadoMapa(viagemAtiva);
      return;
    }
  }, [pedidosAguardaConfirmacao, viagemAtiva]);

  useEffect(() => {
    if (!pedidoSelecionadoMapa) return;

    const aindaExiste = todasViagensVisiveis.some((trip) => trip.id === pedidoSelecionadoMapa.id);
    if (!aindaExiste) {
      setPedidoSelecionadoMapa(null);
    }
  }, [pedidoSelecionadoMapa, todasViagensVisiveis]);

  useEffect(() => {
    if (!pedidoSelecionadoMapa?.id) return;

    const viagemAtualizada = todasViagensVisiveis.find(
      (trip) => trip.id === pedidoSelecionadoMapa.id
    );

    if (!viagemAtualizada) return;

    const mudou =
      viagemAtualizada.status_trip !== pedidoSelecionadoMapa.status_trip ||
      viagemAtualizada.start_location !== pedidoSelecionadoMapa.start_location ||
      viagemAtualizada.end_location !== pedidoSelecionadoMapa.end_location ||
      viagemAtualizada.taxi_matricula !== pedidoSelecionadoMapa.taxi_matricula;

    if (mudou) {
      setPedidoSelecionadoMapa(viagemAtualizada);
    }
  }, [pedidoSelecionadoMapa, todasViagensVisiveis]);

  const turnoAtualTexto = turnoAtivo?.taxi_matricula
    ? `${turnoAtivo.taxi_matricula} · ${turnoAtivo.taxi_marca} ${turnoAtivo.taxi_modelo}`
    : "Sem táxi associado";

  function valorMatriculaValido(valor) {
    if (!valor) return null;

    const texto = String(valor).trim();
    if (!texto) return null;

    const upper = texto.toUpperCase();
    if (upper === "N/A" || upper === "NA" || texto === "-") return null;

    return texto;
  }

  const matriculaMapa =
    valorMatriculaValido(pedidoSelecionadoMapa?.taxi_matricula) ||
    valorMatriculaValido(viagemAtiva?.taxi_matricula) ||
    valorMatriculaValido(pedidosAguardaConfirmacao[0]?.taxi_matricula) ||
    valorMatriculaValido(turnoAtivo?.taxi_matricula) ||
    valorMatriculaValido(turnoAtivo?.taxi?.matricula) ||
    valorMatriculaValido(turnoAtivo?.matricula) ||
    "Táxi do turno";

  function obterTaxiBaseAtual() {
    const taxiIdAtual =
      extrairTaxiId(pedidoSelecionadoMapa) ||
      extrairTaxiId(viagemAtiva) ||
      extrairTaxiId(pedidosAguardaConfirmacao[0]) ||
      extrairTaxiId(turnoAtivo) ||
      null;

    const matriculaAtual =
      valorMatriculaValido(pedidoSelecionadoMapa?.taxi_matricula) ||
      valorMatriculaValido(viagemAtiva?.taxi_matricula) ||
      valorMatriculaValido(pedidosAguardaConfirmacao[0]?.taxi_matricula) ||
      valorMatriculaValido(turnoAtivo?.taxi_matricula) ||
      valorMatriculaValido(turnoAtivo?.taxi?.matricula) ||
      valorMatriculaValido(turnoAtivo?.matricula) ||
      null;

    const taxiEncontrado =
      taxis.find(
        (taxi) =>
          taxiIdAtual &&
          [taxi.id, taxi.id_taxi].some(
            (id) => id && String(id) === String(taxiIdAtual)
          )
      ) ||
      taxis.find(
        (taxi) =>
          matriculaAtual &&
          taxi.matricula &&
          String(taxi.matricula).toLowerCase() ===
            String(matriculaAtual).toLowerCase()
      ) ||
      null;

    const lat =
      numeroOuNull(taxiEncontrado?.lat) ??
      numeroOuNull(taxiEncontrado?.latitude) ??
      numeroOuNull(turnoAtivo?.taxi_latitude) ??
      numeroOuNull(turnoAtivo?.latitude_taxi) ??
      numeroOuNull(turnoAtivo?.taxi?.latitude) ??
      numeroOuNull(turnoAtivo?.taxi?.lat);

    const lon =
      numeroOuNull(taxiEncontrado?.lon) ??
      numeroOuNull(taxiEncontrado?.longitude) ??
      numeroOuNull(turnoAtivo?.taxi_longitude) ??
      numeroOuNull(turnoAtivo?.longitude_taxi) ??
      numeroOuNull(turnoAtivo?.taxi?.longitude) ??
      numeroOuNull(turnoAtivo?.taxi?.lon) ??
      numeroOuNull(turnoAtivo?.taxi?.lng);

    if (lat !== null && lon !== null) {
      return { lat, lon };
    }

    return {
      lat: FCT_LISBOA.lat,
      lon: FCT_LISBOA.lon,
    };
  }

  const taxiBase = obterTaxiBaseAtual();

  const taxiBaseMarker = {
    id: "taxi-driver",
    lon: taxiBase.lon,
    lat: taxiBase.lat,
    label: matriculaMapa || "Táxi do turno",
    color: "#22c55e",
  };

  const viagemMapaAtual = pedidoSelecionadoMapa;

  useEffect(() => {
    let cancelled = false;

    async function carregarMapa() {
      if (!viagemMapaAtual) {
        setPedidoCoords(null);
        setRoutePoints([]);
        setMapView({
          center: [taxiBase.lon, taxiBase.lat],
          zoom: 13,
        });
        return;
      }

      try {
        const origem = await obterCoordsLocal(viagemMapaAtual.start_location);
        const destino = await obterCoordsLocal(viagemMapaAtual.end_location);

        if (!origem || !destino) {
          if (!cancelled) {
            setPedidoCoords(null);
            setRoutePoints([]);
          }
          return;
        }

        if (cancelled) return;

        setPedidoCoords({ origem, destino });

        if (viagemMapaAtual.status_trip === "driver_accepted") {
          const rotaTaxiOrigem = await calcularRota(taxiBase, origem);
          if (cancelled) return;

          setRoutePoints(
            rotaTaxiOrigem?.length
              ? rotaTaxiOrigem
              : [
                  [taxiBase.lon, taxiBase.lat],
                  [origem.lon, origem.lat],
                ]
          );

          setMapView({
            center: [(taxiBase.lon + origem.lon) / 2, (taxiBase.lat + origem.lat) / 2],
            zoom: 12,
          });
          return;
        }

        if (viagemMapaAtual.status_trip === "client_confirmed") {
          const rotaTaxiCliente = await calcularRota(taxiBase, origem);
          if (cancelled) return;

          setRoutePoints(
            rotaTaxiCliente?.length
              ? rotaTaxiCliente
              : [
                  [taxiBase.lon, taxiBase.lat],
                  [origem.lon, origem.lat],
                ]
          );

          setMapView({
            center: [(taxiBase.lon + origem.lon) / 2, (taxiBase.lat + origem.lat) / 2],
            zoom: 12,
          });
          return;
        }

        if (viagemMapaAtual.status_trip === "in_progress") {
          const rotaViagem = await calcularRota(origem, destino);
          if (cancelled) return;

          setRoutePoints(
            rotaViagem?.length
              ? rotaViagem
              : [
                  [origem.lon, origem.lat],
                  [destino.lon, destino.lat],
                ]
          );

          setMapView({
            center: [origem.lon, origem.lat],
            zoom: 13,
          });
          return;
        }

        if (viagemMapaAtual.status_trip === "awaiting_payment") {
          setRoutePoints([]);
          setMapView({
            center: [destino.lon, destino.lat],
            zoom: 13,
          });
          return;
        }

        const rotaPedido = await calcularRota(origem, destino);
        if (cancelled) return;

        setRoutePoints(
          rotaPedido?.length
            ? rotaPedido
            : [
                [origem.lon, origem.lat],
                [destino.lon, destino.lat],
              ]
        );

        setMapView({
          center: [(origem.lon + destino.lon) / 2, (origem.lat + destino.lat) / 2],
          zoom: 11,
        });
      } catch (error) {
        console.error("Erro ao carregar rota do pedido:", error);
        if (!cancelled) {
          setRoutePoints([]);
          setPedidoCoords(null);
        }
      }
    }

    carregarMapa();

    return () => {
      cancelled = true;
    };
  }, [viagemMapaAtual?.id, viagemMapaAtual?.status_trip, taxiBase.lon, taxiBase.lat]);

  const estaEmServico = Boolean(turnoAtivo);
  const podeTerminarTurno = estaEmServico && !temPedidoEmCurso;
  const mostrarReabastecer = estaEmServico && !temPedidoEmCurso;

  const agora = new Date();

  const proximosTurnos = turnosMotorista
    .filter((turno) => {
      const inicio = new Date(turno.start_date);
      return turno.status_shift !== "inactive" && inicio > agora;
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const proximoTurno = proximosTurnos[0] || null;

  useEffect(() => {
    if (turnoAtivo || !proximoTurno) {
      setTempoAteProximoTurno(0);
      return;
    }

    function atualizarCountdownProximoTurno() {
      const inicio = new Date(proximoTurno.start_date);

      if (Number.isNaN(inicio.getTime())) {
        setTempoAteProximoTurno(0);
        return;
      }

      const diferenca = inicio.getTime() - Date.now();

      if (diferenca <= 0) {
        setTempoAteProximoTurno(0);
        carregarTurnoAtivo();
        carregarTurnosMotorista();
        return;
      }

      setTempoAteProximoTurno(diferenca);
    }

    atualizarCountdownProximoTurno();

    const interval = setInterval(atualizarCountdownProximoTurno, 1000);

    return () => clearInterval(interval);
  }, [turnoAtivo, proximoTurno?.id, proximoTurno?.start_date]);

  const markers = [
    ...(!viagemMapaAtual && turnoAtivo ? [taxiBaseMarker] : []),

    ...(viagemMapaAtual?.status_trip === "awaiting_payment" && pedidoCoords?.destino
      ? [
          {
            id: "cliente-destino",
            lon: pedidoCoords.destino.lon,
            lat: pedidoCoords.destino.lat,
            label: "Cliente",
            color: "#ef4444",
          },
        ]
      : []),

    ...(viagemMapaAtual?.status_trip === "in_progress" && pedidoCoords
      ? [
          {
            id: "taxi-origem",
            lon: pedidoCoords.origem.lon,
            lat: pedidoCoords.origem.lat,
            label: matriculaMapa,
            color: "#22c55e",
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

    ...(viagemMapaAtual?.status_trip === "driver_accepted" && pedidoCoords
      ? [
          taxiBaseMarker,
          {
            id: "origem-pedido",
            lon: pedidoCoords.origem.lon,
            lat: pedidoCoords.origem.lat,
            label: "Origem",
            color: "#a855f7",
          },
        ]
      : []),

    ...(viagemMapaAtual?.status_trip === "client_confirmed" && pedidoCoords
      ? [
          taxiBaseMarker,
          {
            id: "cliente-origem",
            lon: pedidoCoords.origem.lon,
            lat: pedidoCoords.origem.lat,
            label: "Cliente",
            color: "#ef4444",
          },
        ]
      : []),

    ...(viagemMapaAtual?.status_trip === "finished" && pedidoCoords
      ? [
          {
            id: "origem-historico",
            lon: pedidoCoords.origem.lon,
            lat: pedidoCoords.origem.lat,
            label: "Origem",
            color: "#a855f7",
          },
          {
            id: "destino-historico",
            lon: pedidoCoords.destino.lon,
            lat: pedidoCoords.destino.lat,
            label: "Destino",
            color: "#c084fc",
          },
        ]
      : []),

    ...(viagemMapaAtual?.status_trip === "pending" && pedidoCoords
      ? [
          taxiBaseMarker,
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
                  -{" "}
                  {new Date(turnoAtivo.end_date).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
              <div className={styles.turnoAtualLinha}>{turnoAtualTexto}</div>
            </>
          ) : (
            <>
              <p className={styles.subtitle}>Não tens nenhum turno ativo neste momento.</p>

              {proximoTurno && (
                <div className={styles.remainingTimeBannerSmall}>
                  <span>Turno começa em:</span>
                  <strong>{formatarTempo(tempoAteProximoTurno)}</strong>
                </div>
              )}
            </>
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
          className={`${styles.ativarTurnoBtn} ${
            estaEmServico ? styles.ativarTurnoBtnAtivo : ""
          }`}
          onClick={podeTerminarTurno ? handleTerminarTurno : handleAtivarTurno}
          disabled={estaEmServico && !podeTerminarTurno}
          title={
            estaEmServico && !podeTerminarTurno
              ? "Não podes terminar o turno enquanto tens um pedido em curso."
              : ""
          }
        >
          {estaEmServico ? "Terminar turno" : "Iniciar turno"}
        </button>

        {mostrarReabastecer && (
          <button
            type="button"
            className={styles.refuelBtn}
            onClick={handleIrParaReabastecimento}
          >
            Reabastecer táxi
          </button>
        )}

        {!temPedidoEmCurso && (
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
        )}

        {abaAtiva === "pedidos" && (
          <>
            {mensagemPainel && (
              <>
                <div className={styles.divider} />
                <div className={styles.errorMsg}>{mensagemPainel}</div>
              </>
            )}

            {!temPedidoEmCurso && (
              <>
                <div className={styles.divider} />
                <div className={styles.sectionTitle}>Pedidos Pendentes</div>
                <div className={styles.lista}>
                  {loadingViagens ? (
                    <div className={styles.emptyState}>A carregar pedidos...</div>
                  ) : erroViagens ? (
                    <div className={styles.emptyStateError}>{erroViagens}</div>
                  ) : !turnoAtivo ? (
                    <div className={styles.emptyState}>
                      Tens de iniciar um turno para veres pedidos pendentes
                    </div>
                  ) : pedidosPendentes.length > 0 && pedidosPendentesComDistancia.length === 0 ? (
                    <div className={styles.emptyState}>
                      Não há pedidos que caibam no tempo restante do turno
                    </div>
                  ) : pedidosPendentesComDistancia.length === 0 ? (
                    <div className={styles.emptyState}>Não há pedidos pendentes</div>
                  ) : (
                    pedidosPendentesComDistancia.map((p) => (
                      <div
                        key={p.id}
                        className={`${styles.pedidoItem} ${
                          pedidoSelecionadoMapa?.id === p.id ? styles.pedidoAtivo : ""
                        }`}
                        onClick={() =>
                          setPedidoSelecionadoMapa(
                            pedidoSelecionadoMapa?.id === p.id ? null : p
                          )
                        }
                      >
                        <div className={styles.pedidoCliente}>Pedido disponível</div>
                        <div className={styles.pedidoRota}>
                          <span>{p.start_location}</span>
                          <span className={styles.rotaArrow}>→</span>
                          <span>{p.end_location}</span>
                        </div>

                        <div className={styles.pedidoMeta}>
                          {p.n_people} pessoa{p.n_people > 1 ? "s" : ""} · {p.nivel_conforto}
                        </div>

                        <div className={styles.pedidoMeta}>
                          Distância: {formatarDistancia(p.distancia_motorista_km)}
                        </div>

                        {pedidoSelecionadoMapa?.id === p.id && (
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
                <div className={styles.sectionTitle}>Histórico de viagens</div>
                <div className={styles.historicList}>
                  {loadingViagens ? (
                    <div className={styles.emptyState}>A carregar histórico...</div>
                  ) : historicoViagens.length === 0 ? (
                    <div className={styles.emptyState}>Ainda não tens viagens finalizadas</div>
                  ) : (
                    historicoViagens.map((v) => (
                      <div
                        key={v.id}
                        className={`${styles.historicoItem} ${
                          pedidoSelecionadoMapa?.id === v.id ? styles.historicoItemAtivo : ""
                        }`}
                        onClick={() =>
                          setPedidoSelecionadoMapa(
                            pedidoSelecionadoMapa?.id === v.id ? null : v
                          )
                        }
                      >
                        <div className={styles.historicoHeader}>
                          <span className={styles.historicoCliente}>Viagem concluída</span>
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
                          <span>{v.n_kms ? `${Number(v.n_kms).toFixed(2)} km` : "-"}</span>
                          <span className={styles.metaDot}>•</span>
                          <span>{formatarIntervaloViagem(v.start_date, v.end_date)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {pedidosAguardaConfirmacao.length > 0 && (
              <>
                <div className={styles.divider} />
                <div className={styles.sectionTitle}>À espera da confirmação do cliente</div>
                <div className={styles.historicList}>
                  {pedidosAguardaConfirmacao.map((v) => (
                    <div
                      key={v.id}
                      className={`${styles.historicoItem} ${
                        pedidoSelecionadoMapa?.id === v.id ? styles.historicoItemAtivo : ""
                      }`}
                      onClick={() => setPedidoSelecionadoMapa(v)}
                    >
                      <div className={styles.historicoHeader}>
                        <span className={styles.historicoCliente}>Pedido aceite</span>
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
                        <span>{v.n_people} pessoa{v.n_people > 1 ? "s" : ""}</span>
                        <span className={styles.metaDot}>•</span>
                        <span>{v.nivel_conforto}</span>
                        {segundosRestantesConfirmacao > 0 && (
                          <>
                            <span className={styles.metaDot}>•</span>
                            <span>A aguardar cliente</span>
                          </>
                        )}
                      </div>

                      {segundosRestantesConfirmacao > 0 ? (
                        <div className={styles.awaitingInfo}>
                          <span>Tempo restante para resposta:</span>{" "}
                          <strong>{formatarCountdown(segundosRestantesConfirmacao)}</strong>
                        </div>
                      ) : (
                        <>
                          <div className={styles.awaitingExpiredBox}>
                            <div className={styles.awaitingExpiredTitle}>
                              O cliente não respondeu dentro do tempo.
                            </div>
                            <div className={styles.awaitingExpiredText}>
                              Podes continuar à espera ou cancelar este pedido.
                            </div>
                          </div>

                          <div className={styles.turnoCardActions}>
                            <button
                              type="button"
                              className={styles.btnCancelarTurno}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelarEspera(v.id, false);
                              }}
                              disabled={carregandoId === v.id}
                            >
                              {carregandoId === v.id ? "A processar..." : "Cancelar espera"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {viagemAtiva && (
              <>
                <div className={styles.divider} />
                <div className={styles.sectionTitle}>Viagem ativa</div>
                <div className={styles.historicList}>
                  <div
                    className={`${styles.historicoItem} ${
                      pedidoSelecionadoMapa?.id === viagemAtiva.id ? styles.historicoItemAtivo : ""
                    }`}
                    onClick={() => setPedidoSelecionadoMapa(viagemAtiva)}
                  >
                    <div className={styles.historicoHeader}>
                      <span className={styles.historicoCliente}>Viagem ativa</span>
                      <span className={styles.historicoGanho}>
                        {viagemAtiva.price ? `${Number(viagemAtiva.price).toFixed(2)} €` : "-"}
                      </span>
                    </div>

                    <div className={styles.historicoRota}>
                      <span>{viagemAtiva.start_location}</span>
                      <span className={styles.rotaArrow}>→</span>
                      <span>{viagemAtiva.end_location}</span>
                    </div>

                    <div className={styles.historicoMeta}>
                      <span>
                        {viagemAtiva.n_people} pessoa{viagemAtiva.n_people > 1 ? "s" : ""}
                      </span>
                      <span className={styles.metaDot}>•</span>
                      <span>{viagemAtiva.nivel_conforto}</span>
                      <span className={styles.metaDot}>•</span>
                      <span>
                        {viagemAtiva.status_trip === "client_confirmed" && "Confirmada"}
                        {viagemAtiva.status_trip === "in_progress" && "Em viagem"}
                      </span>
                    </div>

                    <div className={styles.turnoCardActions}>
                      {viagemAtiva.status_trip === "client_confirmed" && (
                        <button
                          type="button"
                          className={styles.btnAceitar}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIniciarViagem(viagemAtiva.id);
                          }}
                          disabled={carregandoId === viagemAtiva.id}
                        >
                          {carregandoId === viagemAtiva.id ? "A processar..." : "Iniciar viagem"}
                        </button>
                      )}

                      {viagemAtiva.status_trip === "in_progress" && (
                        <button
                          type="button"
                          className={styles.btnCancelarTurno}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinalizarViagem(viagemAtiva.id);
                          }}
                          disabled={carregandoId === viagemAtiva.id}
                        >
                          {carregandoId === viagemAtiva.id ? "A processar..." : "Terminar viagem"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {viagemAguardarPagamento && (
              <>
                <div className={styles.divider} />
                <div className={styles.sectionTitle}>Pagamento pendente</div>
                <div className={styles.historicList}>
                  <div
                    className={`${styles.historicoItem} ${
                      pedidoSelecionadoMapa?.id === viagemAguardarPagamento.id
                        ? styles.historicoItemAtivo
                        : ""
                    }`}
                    onClick={() =>
                      setPedidoSelecionadoMapa(
                        pedidoSelecionadoMapa?.id === viagemAguardarPagamento.id
                          ? null
                          : viagemAguardarPagamento
                      )
                    }
                  >
                    <div className={styles.historicoHeader}>
                      <span className={styles.historicoCliente}>Última viagem terminada</span>
                      <span className={styles.historicoGanho}>
                        {viagemAguardarPagamento.price
                          ? `${Number(viagemAguardarPagamento.price).toFixed(2)} €`
                          : "-"}
                      </span>
                    </div>

                    <div className={styles.historicoRota}>
                      <span>{viagemAguardarPagamento.start_location}</span>
                      <span className={styles.rotaArrow}>→</span>
                      <span>{viagemAguardarPagamento.end_location}</span>
                    </div>

                    <div className={styles.awaitingInfo}>
                      A aguardar pagamento do cliente
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {abaAtiva === "turnos" && !temPedidoEmCurso && (
          <>
            <div className={styles.divider} />
            <div className={styles.sectionTitle}>Próximos Turnos</div>
            <div className={styles.lista}>
              {proximosTurnos.length === 0 ? (
                <div className={styles.emptyState}>Não tens próximos turnos agendados</div>
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
                        -{" "}
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
          center={mapView.center}
          zoom={mapView.zoom}
          onMarkerClick={() => {}}
        />
      </div>
    </div>
  );
}