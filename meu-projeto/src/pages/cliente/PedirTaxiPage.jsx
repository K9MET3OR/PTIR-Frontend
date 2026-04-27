import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapaBase from "../../components/MapaBase";
import { geocodificar, calcularRota } from "../../services/geocodingService";
import { criarSolicitacaoViagem, atualizarViagem, obterDetalheViagem} from "../../services/tripService";
import { taxiService } from "../../services/taxiService";
import { useAuth } from "../../context/AuthContext";
import { COR_ESTADO } from "../../services/mockData";
import styles from "./PedirTaxiPage.module.css";

const CONFORTO_OPTS = ["Básico", "Luxuoso"];


// Função auxiliar: calcular distância em km entre dois pontos (haversine)
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
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

export default function PedirTaxiPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [origemInput,    setOrigemInput]    = useState("");
  const [destinoInput,   setDestinoInput]   = useState("");
  const [origemCoords,   setOrigemCoords]   = useState(null);
  const [destinoCoords,  setDestinoCoords]  = useState(null);
  const [sugestoesOrigem,  setSugestoesOrigem]  = useState([]);
  const [sugestoesDestino, setSugestoesDestino] = useState([]);
  const [nPessoas,       setNPessoas]       = useState(1);
  const [conforto,       setConforto]       = useState("Básico");
  const [selectedRide,   setSelectedRide]   = useState("Básico");
  const [step,           setStep]           = useState("form"); // form | opcoes | aguardar
  const [loading,        setLoading]        = useState(false);
  const [erro,           setErro]           = useState("");
  const [routePoints,    setRoutePoints]    = useState([]);
  const [distanciaKm,    setDistanciaKm]    = useState(0);
  const [duracao,        setDuracao]        = useState(0);
  const [precos,         setPrecos]         = useState({}); // { Básico: {...}, Luxuoso: {...} }
  const [carregandoPrecos, setCarregandoPrecos] = useState(false);
  const [tripId,         setTripId]         = useState(null);
  const [taxis,          setTaxis]          = useState([]);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [carregandoTaxis, setCarregandoTaxis] = useState(false);
  const [estadoViagem, setEstadoViagem] = useState(null);

  const origemTimer  = useRef(null);
  const destinoTimer = useRef(null);

  // Effect: Carregar táxis ao montar o componente
  useEffect(() => {
    carregarTaxis();
  }, []);

  // Effect: Fazer polling enquanto está à espera
  useEffect(() => {
    if (step !== "aguardar" || !tripId) return;

    const interval = setInterval(async () => {
      try {
        const response = await obterDetalheViagem(tripId);
        const trip = response?.trip;

        if (!trip) return;

        setEstadoViagem(trip.status_trip);

        if (trip.status_trip === "accepted") {
          // Redirecionar para página de pagamento
          const amount = trip.preco || trip.price || 0;
          navigate(`/cliente/pagamento?tripId=${tripId}&amount=${amount}`);
        }

        if (trip.status_trip === "cancelled") {
          setErro("O pedido foi cancelado.");
          setStep("form");
          setTripId(null);
          setEstadoViagem(null);
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

  async function carregarTaxis() {
    setCarregandoTaxis(true);
    try {
      const response = await taxiService.list();
      // A API retorna transformada para { data: [...] }
      const todosTaxis = response.data || [];
      
      // Mapear a resposta para o formato esperado
      const taxisFormatados = todosTaxis.map(taxi => ({
        id: taxi.id,
        matricula: taxi.matricula,
        lon: parseFloat(taxi.longitude) || -9.1393,
        lat: parseFloat(taxi.latitude) || 38.7223,
        estado: taxi.estado || "disponivel",
        nivel_conforto: taxi.nivel_conforto || "Standard",
        marca: taxi.marca || "",
        modelo: taxi.modelo || "",
      }));
      setTaxis(taxisFormatados);
    } catch (error) {
      console.error("Erro ao carregar táxis:", error);
      setTaxis([]); // Usar lista vazia em caso de erro
    } finally {
      setCarregandoTaxis(false);
    }
  }

  // Função: Calcular preços para os 3 níveis de conforto
  async function calcularPrecos(lat1, lon1, lat2, lon2) {
    const distancia = calcularDistanciaKm(lat1, lon1, lat2, lon2);
    const duracao = Math.round((distancia / 40) * 60); // Estimativa: 40 km/h

    setDistanciaKm(distancia);
    setDuracao(duracao);
    setCarregandoPrecos(true);

    try {
      const precosCalculados = {};
      
      for (const nivel of CONFORTO_OPTS) {
        const res = await fetch("http://localhost:8000/api/taxis/calcular-preco-com-conforto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            distancia_km: distancia,
            duracao_minutos: duracao,
            nivel_conforto: nivel,
          }),
        });

        if (!res.ok) throw new Error("Erro ao calcular preço");
        const data = await res.json();
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

  // Efeito: Quando origem/destino mudam, recalcula preços
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

  // Monta markers — táxis disponíveis + origem/destino se definidos
  const markers = [
    ...taxis.filter((t) => t.estado === "disponivel").map((t) => ({
      ...t,
      label: t.matricula,
      color: COR_ESTADO.disponivel,
    })),
    ...(origemCoords
      ? [{ id: "origem",  lon: origemCoords.lon,  lat: origemCoords.lat,  label: "Origem",  color: "#a855f7" }]
      : []),
    ...(destinoCoords
      ? [{ id: "destino", lon: destinoCoords.lon, lat: destinoCoords.lat, label: "Destino", color: "#c084fc" }]
      : []),
  ];

  const rotaSelecionada = origemCoords && destinoCoords;

  useEffect(() => {
    let cancel = false;

    if (!rotaSelecionada) {
      setRoutePoints([]);
      return;
    }

    async function buscarRota() {
      try {
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
      } catch {
        if (!cancel) {
          setRoutePoints([
            [origemCoords.lon, origemCoords.lat],
            [destinoCoords.lon, destinoCoords.lat],
          ]);
        }
      }
    }

    buscarRota();

    return () => {
      cancel = true;
    };
  }, [origemCoords, destinoCoords, rotaSelecionada]);

  // Centro do mapa — se origem e destino definidos, centraliza entre os dois pontos
  const mapCenter = rotaSelecionada
    ? [
        (origemCoords.lon + destinoCoords.lon) / 2,
        (origemCoords.lat + destinoCoords.lat) / 2,
      ]
    : origemCoords
    ? [origemCoords.lon, origemCoords.lat]
    : [-9.1393, 38.7223];

  const mapZoom = rotaSelecionada ? 12 : origemCoords ? 15 : 13;

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
      // silencia erros de rede
    }
  }

  function handleOrigemChange(e) {
    setOrigemInput(e.target.value);
    setOrigemCoords(null);
    clearTimeout(origemTimer.current);
    origemTimer.current = setTimeout(() => pesquisar(e.target.value, "origem"), 400);
  }

  function handleDestinoChange(e) {
    setDestinoInput(e.target.value);
    setDestinoCoords(null);
    clearTimeout(destinoTimer.current);
    destinoTimer.current = setTimeout(() => pesquisar(e.target.value, "destino"), 400);
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

    if (!origemCoords)  { setErro("Seleciona um local de origem válido."); return; }
    if (!destinoCoords) { setErro("Seleciona um local de destino válido."); return; }
    if (nPessoas < 1 || nPessoas > 4) { setErro("Número de pessoas entre 1 e 4."); return; }

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
    setSelectedRide("Standard");
    setConforto("Standard");
    setTripId(null);
    setEstadoViagem(null);
    setErro("");
  }

  return (
    <div className={styles.root}>
      {/* Painel lateral */}
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
              {/* Origem */}
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
                      <div key={i} className={styles.sugestaoItem} onClick={() => selecionarOrigem(s)}>
                        {s.label.split(",").slice(0, 2).join(",")}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destino */}
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
                      <div key={i} className={styles.sugestaoItem} onClick={() => selecionarDestino(s)}>
                        {s.label.split(",").slice(0, 2).join(",")}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nº pessoas */}
              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>Nº de pessoas</label>
                <div className={styles.counterRow}>
                  <button type="button" className={styles.counterBtn}
                    onClick={() => setNPessoas((n) => Math.max(1, n - 1))}>−</button>
                  <span className={styles.counterVal}>{nPessoas}</span>
                  <button type="button" className={styles.counterBtn}
                    onClick={() => setNPessoas((n) => Math.min(4, n + 1))}>+</button>
                </div>
              </div>

              
              

              {erro && <p className={styles.erro}>{erro}</p>}

              <button type="submit" className={styles.submitBtn}>
                Ver táxis disponíveis →
              </button>
            </form>

            {/* Legenda táxis no mapa */}
            <div className={styles.divider} />
            <div className={styles.legendaTitle}>Táxis disponíveis</div>
            <div className={styles.legenda}>
              {carregandoTaxis ? (
                <div style={{ padding: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
                  A carregar táxis...
                </div>
              ) : taxis.filter((t) => t.estado === "disponivel").length === 0 ? (
                <div style={{ padding: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
                  Nenhum táxi disponível no momento
                </div>
              ) : (
                taxis.filter((t) => t.estado === "disponivel").map((t) => (
                  <div key={t.id} className={styles.legendaItem}>
                    <div className={styles.legendaDot} style={{ background: COR_ESTADO.disponivel }} />
                    <span>{t.matricula} · {t.nivel_conforto}</span>
                  </div>
                ))
              )}
            </div>
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
                <span>~{duracao} min</span>
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
                  Standard: "Viagens diárias económicas",
                  Conforto: "Viagens mais rápidas e confortáveis",
                  Premium: "Viagens com serviço premium e melhor espaço",
                };
                const titulo = {
                  Standard: "Hermez Standard",
                  Conforto: "Hermez Conforto",
                  Premium: "Hermez Premium",
                };

                return (
                  <button
                    key={nivel}
                    type="button"
                    className={`${styles.rideCard} ${selectedRide === nivel ? styles.rideCardAtivo : ""}`}
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
                      <span className={styles.rideDuration}>{duracao > 0 ? `~${duracao} min` : "-"}</span>
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
            <p className={styles.subtitle}>O teu pedido foi enviado. Um motorista irá responder em breve.</p>

            {/* Resumo do Pedido */}
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
                  <span className={styles.resumoValor}>{duracao} min</span>
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

            <button className={styles.cancelBtn} style={{ marginTop: "1.5rem" }} onClick={cancelar}>
              Cancelar pedido
            </button>
          </div>
        )}

        {step === "aceite" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>🚕</div>
            <h2 className={styles.title}>Motorista encontrado</h2>
            <p className={styles.subtitle}>
              O teu pedido foi aceite. O motorista está a caminho.
            </p>
          </div>
        )}

        {step === "finalizada" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>✅</div>
            <h2 className={styles.title}>Viagem concluída</h2>
            <p className={styles.subtitle}>
              A tua viagem foi finalizada com sucesso.
            </p>
          </div>
        )}
      </aside>

      {/* Mapa */}
      <div className={styles.mapaWrap}>

        <div className={styles.profileCardWrapper}>
          <button
            className={styles.profileBtn}
            onClick={() => setProfileOpen(v => !v)}
          >
            {user?.email
              ? user.email.slice(0, 2).toUpperCase()
              : "??"}
          </button>

          {profileOpen && (
            <div className={styles.profileMenu}>
              <button className={styles.profileMenuItem}>
                Editar perfil
              </button>
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
          center={mapCenter}
          zoom={mapZoom}
        />
      </div>
    </div>
  );
}