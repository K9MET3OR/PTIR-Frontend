import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MapaBase from "../../components/MapaBase";
import { taxiService } from "../../services/taxiService";
import { geocodificar, calcularRota } from "../../services/geocodingService";
import {
  criarSolicitacaoViagem,
  atualizarViagem,
  obterDetalheViagem,
  confirmarMotoristaCliente,
  rejeitarMotoristaCliente,
} from "../../services/tripService";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import styles from "./PedirTaxiPage.module.css";

const CONFORTO_OPTS = ["Básico", "Luxuoso"];

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatarTempoEstimado(minutos) {
  const totalMin = Math.max(0, Math.round(Number(minutos) || 0));

  if (totalMin < 60) {
    return `${totalMin} min`;
  }

  const horas = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (mins === 0) {
    return `${horas}h`;
  }

  return `${horas}h ${mins}m`;
}

function formatarDistancia(km) {
  if (km == null || Number.isNaN(Number(km))) return "A calcular...";
  const valor = Number(km);

  if (valor < 1) {
    return `${Math.round(valor * 1000)} m`;
  }

  return `${valor.toFixed(1)} km`;
}

export default function PedirTaxiPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [origemInput, setOrigemInput] = useState("");
  const [destinoInput, setDestinoInput] = useState("");
  const [origemCoords, setOrigemCoords] = useState(null);
  const [destinoCoords, setDestinoCoords] = useState(null);
  const [sugestoesOrigem, setSugestoesOrigem] = useState([]);
  const [sugestoesDestino, setSugestoesDestino] = useState([]);
  const [nPessoas, setNPessoas] = useState(1);
  const [conforto, setConforto] = useState("Básico");
  const [selectedRide, setSelectedRide] = useState("Básico");
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [routePoints, setRoutePoints] = useState([]);
  const [distanciaKm, setDistanciaKm] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [precos, setPrecos] = useState({});
  const [carregandoPrecos, setCarregandoPrecos] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [taxis, setTaxis] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [carregandoTaxis, setCarregandoTaxis] = useState(false);
  const [estadoViagem, setEstadoViagem] = useState(null);
  const [tripDetalhes, setTripDetalhes] = useState(null);
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [etaMotoristaMin, setEtaMotoristaMin] = useState(null);
  const [searchParams] = useSearchParams();
  const [distanciaMotoristaKm, setDistanciaMotoristaKm] = useState(null);;

  const origemTimer = useRef(null);
  const destinoTimer = useRef(null);

  const [mapView, setMapView] = useState({
    center: [-9.1393, 38.7223],
    zoom: 13,
  });

  useEffect(() => {
    carregarTaxis();
  }, []);

  useEffect(() => {
    if (
      !tripId ||
      ![
        "aguardar",
        "aceite",
        "motorista_a_caminho",
        "em_viagem",
        "pagamento_pendente",
      ].includes(step)
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await obterDetalheViagem(tripId);
        const trip = response?.trip;
        if (!trip) return;

        setEstadoViagem(trip.status_trip);
        setTripDetalhes(trip);

        if (trip.status_trip === "driver_accepted") {
          setStep("aceite");
          return;
        }

        if (trip.status_trip === "client_confirmed") {
          setStep("motorista_a_caminho");
          return;
        }

        if (trip.status_trip === "in_progress") {
          setStep("em_viagem");
          return;
        }

        if (trip.status_trip === "awaiting_payment") {
          setStep("pagamento_pendente");
          return;
        }

        if (trip.status_trip === "cancelled") {
          setErro("O pedido foi cancelado.");
          setStep("form");
          setTripId(null);
          setTripDetalhes(null);
          setTaxiSelecionado(null);
          setEstadoViagem(null);
          return;
        }

        if (trip.status_trip === "finished") {
          setStep("finalizada");
        }
      } catch (error) {
        console.error("Erro ao verificar estado da viagem:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, tripId]);

  useEffect(() => {
    if (
      (estadoViagem === "driver_accepted" || estadoViagem === "client_confirmed") &&
      taxiSelecionado &&
      origemCoords
    ) {
      setMapView({
        center: [
          (taxiSelecionado.lon + origemCoords.lon) / 2,
          (taxiSelecionado.lat + origemCoords.lat) / 2,
        ],
        zoom: 12,
      });
      return;
    }

    if (estadoViagem === "in_progress" && origemCoords) {
      setMapView({
        center: [origemCoords.lon, origemCoords.lat],
        zoom: 14,
      });
      return;
    }

    if (estadoViagem === "awaiting_payment" && destinoCoords) {
      setMapView({
        center: [destinoCoords.lon, destinoCoords.lat],
        zoom: 14,
      });
      return;
    }

    if (step === "form") {
      if (destinoCoords) {
        setMapView({
          center: [destinoCoords.lon, destinoCoords.lat],
          zoom: 15,
        });
      } else if (origemCoords) {
        setMapView({
          center: [origemCoords.lon, origemCoords.lat],
          zoom: 15,
        });
      } else {
        setMapView({
          center: [-9.1393, 38.7223],
          zoom: 13,
        });
      }
      return;
    }

    if (step === "opcoes" || step === "aguardar") {
      if (origemCoords && destinoCoords) {
        setMapView({
          center: [
            (origemCoords.lon + destinoCoords.lon) / 2,
            (origemCoords.lat + destinoCoords.lat) / 2,
          ],
          zoom: 11,
        });
      } else if (destinoCoords) {
        setMapView({
          center: [destinoCoords.lon, destinoCoords.lat],
          zoom: 15,
        });
      } else if (origemCoords) {
        setMapView({
          center: [origemCoords.lon, origemCoords.lat],
          zoom: 15,
        });
      } else {
        setMapView({
          center: [-9.1393, 38.7223],
          zoom: 11,
        });
      }
      return;
    }
  }, [estadoViagem, step, taxiSelecionado, origemCoords, destinoCoords]);

  useEffect(() => {
    if (!tripDetalhes || !taxis.length) {
      setTaxiSelecionado(null);
      return;
    }

    const taxiMatch =
      taxis.find((t) => tripDetalhes.taxi_id && String(t.id) === String(tripDetalhes.taxi_id)) ||
      taxis.find(
        (t) =>
          tripDetalhes.taxi_matricula &&
          String(t.matricula).toLowerCase() === String(tripDetalhes.taxi_matricula).toLowerCase()
      ) ||
      null;

    setTaxiSelecionado(taxiMatch);
  }, [tripDetalhes, taxis]);

  useEffect(() => {
    if (
      !taxiSelecionado ||
      !origemCoords ||
      !["driver_accepted", "client_confirmed"].includes(estadoViagem)
    ) {
      setEtaMotoristaMin(null);
      setDistanciaMotoristaKm(null);
      return;
    }

    const distanciaAteCliente = calcularDistanciaKm(
      taxiSelecionado.lat,
      taxiSelecionado.lon,
      origemCoords.lat,
      origemCoords.lon
    );

    setDistanciaMotoristaKm(distanciaAteCliente);

    const minutos = Math.max(1, Math.round((distanciaAteCliente / 40) * 60));
    setEtaMotoristaMin(minutos);
  }, [taxiSelecionado, origemCoords, estadoViagem]);

  useEffect(() => {
    async function sincronizarCoordsDaTrip() {
      if (!tripDetalhes) return;
      try {
        if (tripDetalhes.start_location && !origemCoords) {
          const origemRes = await geocodificar(tripDetalhes.start_location);
          if (origemRes?.length) {
            setOrigemCoords({
              lon: parseFloat(origemRes[0].lon),
              lat: parseFloat(origemRes[0].lat),
            });
          }
        }

        if (tripDetalhes.end_location && !destinoCoords) {
          const destinoRes = await geocodificar(tripDetalhes.end_location);
          if (destinoRes?.length) {
            setDestinoCoords({
              lon: parseFloat(destinoRes[0].lon),
              lat: parseFloat(destinoRes[0].lat),
            });
          }
        }
      } catch (error) {
        console.error("Erro ao sincronizar coordenadas da viagem:", error);
      }
    }

    sincronizarCoordsDaTrip();
  }, [tripDetalhes, origemCoords, destinoCoords]);

  useEffect(() => {
    async function recuperarTripPendente() {
      const tripIdFromUrl = searchParams.get("tripId");
      const resume = searchParams.get("resume");

      if (!tripIdFromUrl || resume !== "payment") return;

      try {
        const response = await obterDetalheViagem(tripIdFromUrl);
        const trip = response?.trip;
        if (!trip) return;

        setTripId(trip.id);
        setTripDetalhes(trip);
        setEstadoViagem(trip.status_trip);

        setOrigemInput(trip.start_location || "");
        setDestinoInput(trip.end_location || "");

        if (trip.start_location) {
          const origemRes = await geocodificar(trip.start_location);
          if (origemRes?.length) {
            setOrigemCoords({
              lon: parseFloat(origemRes[0].lon),
              lat: parseFloat(origemRes[0].lat),
            });
          }
        }

        if (trip.end_location) {
          const destinoRes = await geocodificar(trip.end_location);
          if (destinoRes?.length) {
            setDestinoCoords({
              lon: parseFloat(destinoRes[0].lon),
              lat: parseFloat(destinoRes[0].lat),
            });
          }
        }

        if (trip.status_trip === "awaiting_payment") {
          setStep("pagamento_pendente");
        } else if (trip.status_trip === "finished") {
          setStep("finalizada");
        }
      } catch (error) {
        console.error("Erro ao recuperar viagem pendente:", error);
      }
    }

    recuperarTripPendente();
  }, [searchParams]);

  async function carregarTaxis() {
    setCarregandoTaxis(true);
    try {
      const response = await taxiService.list();
      const todosTaxis = response.data || [];

      const taxisFormatados = todosTaxis.map((taxi) => ({
        id: taxi.id,
        matricula: taxi.matricula,
        lon: parseFloat(taxi.longitude) || -9.1393,
        lat: parseFloat(taxi.latitude) || 38.7223,
        estado: taxi.estado || "disponivel",
        nivel_conforto: taxi.nivel_conforto || "Básico",
        marca: taxi.marca || "",
        modelo: taxi.modelo || "",
      }));

      setTaxis(taxisFormatados);
    } catch (error) {
      console.error("Erro ao carregar táxis:", error);
      setTaxis([]);
    } finally {
      setCarregandoTaxis(false);
    }
  }

  async function calcularPrecos(lat1, lon1, lat2, lon2) {
    const distancia = calcularDistanciaKm(lat1, lon1, lat2, lon2);
    const duracao = Math.round((distancia / 40) * 60);

    setDistanciaKm(distancia);
    setDuracao(duracao);
    setCarregandoPrecos(true);

    try {
      const precosCalculados = {};

      for (const nivel of CONFORTO_OPTS) {
        const data = await api.post("/taxi/calcular-preco-com-conforto", {
          distancia_km: distancia,
          duracao_minutos: duracao,
          nivel_conforto: nivel,
        });

        if (!data || !data.price) throw new Error("Erro ao calcular preço");

        precosCalculados[nivel] = {
          price: data.price,
          breakdown: data.breakdown,
        };
      }

      setPrecos(precosCalculados);
    } catch (err) {
      console.error("Erro ao calcular preços:", err);
      setErro("Erro ao calcular preços. Tenta novamente.");
    } finally {
      setCarregandoPrecos(false);
    }
  }

  useEffect(() => {
    if (origemCoords && destinoCoords) {
      calcularPrecos(
        origemCoords.lat,
        origemCoords.lon,
        destinoCoords.lat,
        destinoCoords.lon
      );
    }
  }, [origemCoords, destinoCoords]);

  const mostrarSoTaxiDaViagem =
    ["driver_accepted", "client_confirmed", "in_progress"].includes(estadoViagem) && taxiSelecionado;

  const taxiMarker =
    estadoViagem === "in_progress" && origemCoords
      ? {
          id: "taxi-em-viagem",
          lon: origemCoords.lon,
          lat: origemCoords.lat,
          label: tripDetalhes?.taxi_matricula || "Táxi",
          color: "#22c55e",
        }
      : mostrarSoTaxiDaViagem
      ? {
          ...taxiSelecionado,
          label: taxiSelecionado.matricula,
          color: "#22c55e",
        }
      : null;

  const markers = [
    ...(taxiMarker ? [taxiMarker] : []),
    ...(origemCoords &&
      estadoViagem !== "awaiting_payment" &&
      estadoViagem !== "in_progress"
      ? [
          {
            id: "origem",
            lon: origemCoords.lon,
            lat: origemCoords.lat,
            label: "Origem",
            color: "#a855f7",
          },
        ]
      : []),
    ...(destinoCoords && estadoViagem !== "awaiting_payment"
      ? [
          {
            id: "destino",
            lon: destinoCoords.lon,
            lat: destinoCoords.lat,
            label: "Destino",
            color: "#c084fc",
          },
        ]
      : []),
    ...(estadoViagem === "awaiting_payment" && destinoCoords
      ? [
          {
            id: "eu-destino",
            lon: destinoCoords.lon,
            lat: destinoCoords.lat,
            label: "Eu",
            color: "#ef4444",
          },
        ]
      : []),
  ];

  const rotaSelecionada = origemCoords && destinoCoords;

  useEffect(() => {
    let cancel = false;

    async function buscarRota() {
      try {
        if (
          (estadoViagem === "driver_accepted" || estadoViagem === "client_confirmed") &&
          taxiSelecionado &&
          origemCoords
        ) {
          const rota = await calcularRota(
            { lon: taxiSelecionado.lon, lat: taxiSelecionado.lat },
            origemCoords
          );

          if (cancel) return;

          if (rota && rota.length) {
            setRoutePoints(rota);
          } else {
            setRoutePoints([
              [taxiSelecionado.lon, taxiSelecionado.lat],
              [origemCoords.lon, origemCoords.lat],
            ]);
          }
          return;
        }

        if (
          (estadoViagem === "in_progress" || rotaSelecionada) &&
          origemCoords &&
          destinoCoords
        ) {
          const rota = await calcularRota(origemCoords, destinoCoords);

          if (cancel) return;

          if (rota && rota.length) {
            setRoutePoints(rota);
          } else {
            setRoutePoints([
              [origemCoords.lon, origemCoords.lat],
              [destinoCoords.lon, destinoCoords.lat],
            ]);
          }
          return;
        }

        if (estadoViagem === "awaiting_payment") {
          setRoutePoints([]);
          return;
        }

        setRoutePoints([]);
      } catch {
        if (!cancel) {
          if (
            (estadoViagem === "driver_accepted" || estadoViagem === "client_confirmed") &&
            taxiSelecionado &&
            origemCoords
          ) {
            setRoutePoints([
              [taxiSelecionado.lon, taxiSelecionado.lat],
              [origemCoords.lon, origemCoords.lat],
            ]);
          } else if (
            (estadoViagem === "in_progress" || rotaSelecionada) &&
            origemCoords &&
            destinoCoords
          ) {
            setRoutePoints([
              [origemCoords.lon, origemCoords.lat],
              [destinoCoords.lon, destinoCoords.lat],
            ]);
          } else {
            setRoutePoints([]);
          }
        }
      }
    }

    buscarRota();

    return () => {
      cancel = true;
    };
  }, [origemCoords, destinoCoords, rotaSelecionada, estadoViagem, taxiSelecionado]);

  async function pesquisar(valor, tipo) {
    if (valor.length < 3) {
      tipo === "origem" ? setSugestoesOrigem([]) : setSugestoesDestino([]);
      return;
    }

    try {
      const resultados = await geocodificar(valor);
      if (resultados) {
        tipo === "origem"
          ? setSugestoesOrigem(resultados.slice(0, 4))
          : setSugestoesDestino(resultados.slice(0, 4));
      }
    } catch {
      // ignorar
    }
  }

  function handleOrigemChange(e) {
    setOrigemInput(e.target.value);
    setOrigemCoords(null);
    clearTimeout(origemTimer.current);
    origemTimer.current = setTimeout(() => pesquisar(e.target.value, "origem"), 1000);
  }

  function handleDestinoChange(e) {
    setDestinoInput(e.target.value);
    setDestinoCoords(null);
    clearTimeout(destinoTimer.current);
    destinoTimer.current = setTimeout(() => pesquisar(e.target.value, "destino"), 1000);
  }

  function selecionarOrigem(s) {
    setOrigemInput(s.label.split(",")[0]);
    setOrigemCoords({ lon: s.lon, lat: s.lat });
    setSugestoesOrigem([]);
  }

  function selecionarDestino(s) {
    setDestinoInput(s.label.split(",")[0]);
    setDestinoCoords({ lon: s.lon, lat: s.lat });
    setSugestoesDestino([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!origemCoords) {
      setErro("Seleciona um local de origem válido.");
      return;
    }
    if (!destinoCoords) {
      setErro("Seleciona um local de destino válido.");
      return;
    }
    if (nPessoas < 1 || nPessoas > 4) {
      setErro("Número de pessoas entre 1 e 4.");
      return;
    }

    setSelectedRide(conforto);
    setStep("opcoes");
  }

  function confirmarPedido() {
    if (!user || !user.id) {
      setErro("Tens de estar autenticado para fazer um pedido.");
      return;
    }

    setLoading(true);
    setErro("");

    const precoSelecionado = precos[selectedRide];
    const preco = precoSelecionado ? Number(precoSelecionado.price) : 0;

    criarSolicitacaoViagem({
      clientId: user.id,
      startLocation: origemInput,
      endLocation: destinoInput,
      nPeople: nPessoas,
      nKms: distanciaKm,
      price: preco,
      startDate: new Date().toISOString(),
      nivelConforto: selectedRide,
    })
      .then((response) => {
        if (response.trip && response.trip.id) {
          setTripId(response.trip.id);
          setTripDetalhes(response.trip);
          setEstadoViagem(response.trip.status_trip || "pending");
          setLoading(false);
          setStep("aguardar");
        } else {
          setErro("Resposta do servidor inválida.");
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Erro ao criar solicitação:", error);
        setErro(error.message || "Erro ao enviar pedido. Tenta novamente.");
        setLoading(false);
      });
  }

  async function aceitarMotorista() {
    try {
      setLoading(true);
      setErro("");

      const response = await confirmarMotoristaCliente(tripId);
      const trip = response.trip || null;
      setTripDetalhes(trip);
      setEstadoViagem(trip?.status_trip || "client_confirmed");
      setStep("motorista_a_caminho");
    } catch (error) {
      setErro(error.message || "Erro ao confirmar motorista.");
    } finally {
      setLoading(false);
    }
  }

  async function rejeitarMotorista() {
    try {
      setLoading(true);
      setErro("");

      const response = await rejeitarMotoristaCliente(tripId);
      setTripDetalhes(response.trip || null);
      setEstadoViagem(response.trip?.status_trip || "pending");
      setStep("aguardar");
      setErro("Rejeitaste este motorista. O pedido voltou a ficar pendente.");
    } catch (error) {
      setErro(error.message || "Erro ao rejeitar motorista.");
    } finally {
      setLoading(false);
    }
  }

  function retomarPagamento() {
    if (!tripId || !tripDetalhes?.price) return;
    navigate(`/cliente/pagamento?tripId=${tripId}&amount=${tripDetalhes.price}`);
  }

  async function cancelar() {
    try {
      if (tripId) {
        await atualizarViagem(tripId, { status_trip: "cancelled" });
      }
    } catch (error) {
      console.error("Erro ao cancelar viagem:", error);
    }

    setStep("form");
    setOrigemInput("");
    setDestinoInput("");
    setOrigemCoords(null);
    setDestinoCoords(null);
    setSelectedRide("Básico");
    setConforto("Básico");
    setTripId(null);
    setTripDetalhes(null);
    setTaxiSelecionado(null);
    setEstadoViagem(null);
    setErro("");
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        {step === "form" && (
          <>
            <div className={styles.brand}>
              <div className={styles.brandLogo}>H</div>
              <div>
                <div className={styles.brandName}>Hermez</div>
                <div className={styles.brandSub}>Pedir viagem</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldDot} style={{ background: "#a855f7" }} />
                  Origem
                </label>
                <input
                  className={styles.input}
                  placeholder="Aeroporto, Rossio..."
                  value={origemInput}
                  onChange={handleOrigemChange}
                  autoComplete="off"
                />
                {sugestoesOrigem.length > 0 && (
                  <div className={styles.sugestoes}>
                    {sugestoesOrigem.map((s, i) => (
                      <div
                        key={i}
                        className={styles.sugestaoItem}
                        onClick={() => selecionarOrigem(s)}
                      >
                        {s.label.split(",").slice(0, 2).join(",")}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldDot} style={{ background: "#c084fc" }} />
                  Destino
                </label>
                <input
                  className={styles.input}
                  placeholder="Belém, Parque das Nações..."
                  value={destinoInput}
                  onChange={handleDestinoChange}
                  autoComplete="off"
                />
                {sugestoesDestino.length > 0 && (
                  <div className={styles.sugestoes}>
                    {sugestoesDestino.map((s, i) => (
                      <div
                        key={i}
                        className={styles.sugestaoItem}
                        onClick={() => selecionarDestino(s)}
                      >
                        {s.label.split(",").slice(0, 2).join(",")}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>Nº de pessoas</label>
                <div className={styles.counterRow}>
                  <button
                    type="button"
                    className={styles.counterBtn}
                    onClick={() => setNPessoas((n) => Math.max(1, n - 1))}
                  >
                    −
                  </button>
                  <span className={styles.counterVal}>{nPessoas}</span>
                  <button
                    type="button"
                    className={styles.counterBtn}
                    onClick={() => setNPessoas((n) => Math.min(4, n + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {erro && <p className={styles.erro}>{erro}</p>}

              <button type="submit" className={styles.submitBtn}>
                Ver táxis disponíveis →
              </button>
            </form>
          </>
        )}

        {step === "opcoes" && (
          <div className={styles.opcoes}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.title}>Escolher uma viagem</h2>
              <p className={styles.subtitle}>Viagens que acreditamos que gostarás</p>
            </div>

            <div className={styles.routeSummary}>
              <div className={styles.rotaCard}>
                <div className={styles.rotaItem}>
                  <div className={styles.rotaDot} style={{ background: "#a855f7" }} />
                  <div>
                    <div className={styles.rotaLabel}>Origem</div>
                    <div className={styles.rotaVal}>{origemInput}</div>
                  </div>
                </div>
                <div className={styles.rotaLine} />
                <div className={styles.rotaItem}>
                  <div className={styles.rotaDot} style={{ background: "#c084fc" }} />
                  <div>
                    <div className={styles.rotaLabel}>Destino</div>
                    <div className={styles.rotaVal}>{destinoInput}</div>
                  </div>
                </div>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Pessoas</span>
                <span>{nPessoas}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Distância</span>
                <span>{distanciaKm.toFixed(1)} km</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Duração est.</span>
                <span>{formatarTempoEstimado(duracao)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Nível de conforto</span>
                <span>{conforto}</span>
              </div>
            </div>

            <div className={styles.rideList}>
              {CONFORTO_OPTS.map((nivel) => {
                const preco = precos[nivel];
                const descricao = {
                  Básico: "Viagens diárias económicas",
                  Luxuoso: "Viagens com serviço premium e melhor espaço",
                };
                const titulo = {
                  Básico: "Hermez Básico",
                  Luxuoso: "Hermez Luxuoso",
                };

                return (
                  <button
                    key={nivel}
                    type="button"
                    className={`${styles.rideCard} ${
                      selectedRide === nivel ? styles.rideCardAtivo : ""
                    }`}
                    onClick={() => {
                      setSelectedRide(nivel);
                      setConforto(nivel);
                    }}
                    disabled={carregandoPrecos}
                  >
                    <div className={styles.rideInfo}>
                      <div className={styles.rideTitle}>{titulo[nivel]}</div>
                      <div className={styles.rideSubtitle}>{descricao[nivel]}</div>
                    </div>
                    <div className={styles.rideMeta}>
                      <span className={styles.ridePrice}>
                        {preco ? `${preco.price.toFixed(2)} €` : "-"}
                      </span>
                      <span className={styles.rideDuration}>
                        {duracao > 0 ? formatarTempoEstimado(duracao) : "-"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button
              className={styles.submitBtn}
              onClick={confirmarPedido}
              disabled={loading || carregandoPrecos}
            >
              {loading ? "A enviar…" : `Pedir Hermez ${selectedRide}`}
            </button>

            <button className={styles.cancelBtn} onClick={cancelar}>
              Voltar
            </button>
          </div>
        )}

        {step === "aguardar" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>⏳</div>
            <h2 className={styles.title}>À espera de motorista</h2>
            <p className={styles.subtitle}>
              O teu pedido foi enviado. Um motorista irá responder em breve.
            </p>

            <div className={styles.resumoPedido}>
              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>De:</span>
                  <span className={styles.resumoValor}>{origemInput}</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Para:</span>
                  <span className={styles.resumoValor}>{destinoInput}</span>
                </div>
              </div>

              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Distância:</span>
                  <span className={styles.resumoValor}>{distanciaKm.toFixed(1)} km</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Duração estimada:</span>
                  <span className={styles.resumoValor}>{formatarTempoEstimado(duracao)}</span>
                </div>
              </div>

              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Passageiros:</span>
                  <span className={styles.resumoValor}>{nPessoas}</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Conforto:</span>
                  <span className={styles.resumoValor}>{selectedRide}</span>
                </div>
              </div>

              {precos[selectedRide] && (
                <div className={styles.resumoSecao}>
                  <div className={styles.resumoLinha}>
                    <span className={styles.resumoLabel}>Preço estimado:</span>
                    <span className={styles.resumoValorPreco}>
                      €{typeof precos[selectedRide].price === "number"
                        ? precos[selectedRide].price.toFixed(2)
                        : precos[selectedRide].price}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <button
              className={styles.cancelBtn}
              style={{ marginTop: "1.5rem" }}
              onClick={cancelar}
            >
              Cancelar pedido
            </button>
          </div>
        )}

        {step === "aceite" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>🚕</div>
            <h2 className={styles.title}>Motorista encontrado</h2>

            <p className={styles.subtitle}>
              Um motorista aceitou o teu pedido. Confirma se queres seguir com esta viagem.
            </p>

            <div className={styles.resumoPedido}>
              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Motorista:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.driver_name || "Motorista"}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Táxi:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.taxi_matricula || "N/A"}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Conforto:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.nivel_conforto || selectedRide}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Distância até ti:</span>
                  <span className={styles.resumoValor}>
                    {formatarDistancia(distanciaMotoristaKm)}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Tempo estimado até chegar:</span>
                  <span className={styles.resumoValor}>
                    {etaMotoristaMin ? formatarTempoEstimado(etaMotoristaMin) : "A calcular..."}
                  </span>
                </div>
              </div>

              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Origem:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.start_location || origemInput}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Destino:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.end_location || destinoInput}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Preço estimado:</span>
                  <span className={styles.resumoValorPreco}>
                    €{tripDetalhes?.price ? Number(tripDetalhes.price).toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <div className={styles.confirmacaoActions}>
              <button
                className={styles.submitBtn}
                onClick={aceitarMotorista}
                disabled={loading}
              >
                {loading ? "A confirmar..." : "Aceitar motorista"}
              </button>

              <button
                className={styles.cancelBtn}
                onClick={rejeitarMotorista}
                disabled={loading}
              >
                Rejeitar motorista
              </button>
            </div>
          </div>
        )}

        {step === "motorista_a_caminho" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>🛺</div>
            <h2 className={styles.title}>Motorista a caminho</h2>
            <p className={styles.subtitle}>
              O motorista já foi confirmado e está a dirigir-se para o teu local.
            </p>

            <div className={styles.resumoPedido}>
              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Motorista:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.driver_name || "Motorista"}
                  </span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Táxi:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.taxi_matricula || "N/A"}
                  </span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Conforto:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.nivel_conforto || selectedRide}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Distância até ti:</span>
                  <span className={styles.resumoValor}>
                    {formatarDistancia(distanciaMotoristaKm)}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Tempo estimado até chegar:</span>
                  <span className={styles.resumoValor}>
                    {etaMotoristaMin ? formatarTempoEstimado(etaMotoristaMin) : "A calcular..."}
                  </span>
                </div>
              </div>

              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Origem:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.start_location || origemInput}
                  </span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Destino:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.end_location || destinoInput}
                  </span>
                </div>
              </div>
            </div>

            {erro && <p className={styles.erro}>{erro}</p>}

            <div className={styles.estadoBadge}>
              Estamos a acompanhar a chegada do motorista no mapa.
            </div>

            <button className={styles.cancelBtn} onClick={cancelar}>
              Cancelar pedido
            </button>
          </div>
        )}

        {step === "em_viagem" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>🚖</div>
            <h2 className={styles.title}>Viagem em curso</h2>
            <p className={styles.subtitle}>
              A tua viagem já começou. Quando terminar, poderás seguir para o pagamento.
            </p>

            <div className={styles.resumoPedido}>
              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Motorista:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.driver_name || "Motorista"}
                  </span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Táxi:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.taxi_matricula || "N/A"}
                  </span>
                </div>
              </div>

              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Origem:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.start_location || origemInput}
                  </span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Destino:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.end_location || destinoInput}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "pagamento_pendente" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>💳</div>
            <h2 className={styles.title}>Pagamento pendente</h2>
            <p className={styles.subtitle}>
              A viagem terminou. Falta apenas concluíres o pagamento.
            </p>

            <div className={styles.resumoPedido}>
              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Motorista:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.driver_name || "Motorista"}
                  </span>
                </div>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Táxi:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.taxi_matricula || "N/A"}
                  </span>
                </div>
              </div>

              <div className={styles.resumoSecao}>
                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Origem:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.start_location || origemInput}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Destino:</span>
                  <span className={styles.resumoValor}>
                    {tripDetalhes?.end_location || destinoInput}
                  </span>
                </div>

                <div className={styles.resumoLinha}>
                  <span className={styles.resumoLabel}>Valor a pagar:</span>
                  <span className={styles.resumoValorPreco}>
                    €{tripDetalhes?.price ? Number(tripDetalhes.price).toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.confirmacaoActions}>
              <button className={styles.submitBtn} onClick={retomarPagamento}>
                Retomar pagamento
              </button>
            </div>
          </div>
        )}

        {step === "finalizada" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>✅</div>
            <h2 className={styles.title}>Viagem concluída</h2>
            <p className={styles.subtitle}>A tua viagem foi finalizada com sucesso.</p>
          </div>
        )}
      </aside>

      <div className={styles.mapaWrap}>
        <div className={styles.profileCardWrapper}>
          <button
            className={styles.profileBtn}
            onClick={() => setProfileOpen((v) => !v)}
          >
            {user?.email ? user.email.slice(0, 2).toUpperCase() : "??"}
          </button>

          {profileOpen && (
            <div className={styles.profileMenu}>
              <button className={styles.profileMenuItem}>Editar perfil</button>
              <button className={styles.profileMenuItem} onClick={logout}>
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
        />
      </div>
    </div>
  );
}