import { useState, useRef } from "react";
import MapaBase from "../../components/MapaBase";
import { geocodificar } from "../../services/geocodingService";
import { TAXIS_MOCK, COR_ESTADO } from "../../services/mockData";
import styles from "./PedirTaxiPage.module.css";

const CONFORTO_OPTS = ["Standard", "Conforto", "Premium"];

export default function PedirTaxiPage() {
  const [origemInput,    setOrigemInput]    = useState("");
  const [destinoInput,   setDestinoInput]   = useState("");
  const [origemCoords,   setOrigemCoords]   = useState(null);
  const [destinoCoords,  setDestinoCoords]  = useState(null);
  const [sugestoesOrigem,  setSugestoesOrigem]  = useState([]);
  const [sugestoesDestino, setSugestoesDestino] = useState([]);
  const [nPessoas,       setNPessoas]       = useState(1);
  const [conforto,       setConforto]       = useState("Standard");
  const [step,           setStep]           = useState("form"); // form | confirmacao | aguardar
  const [loading,        setLoading]        = useState(false);
  const [erro,           setErro]           = useState("");

  const origemTimer  = useRef(null);
  const destinoTimer = useRef(null);

  // Monta markers — táxis disponíveis + origem/destino se definidos
  const markers = [
    ...TAXIS_MOCK.filter((t) => t.estado === "disponivel").map((t) => ({
      ...t,
      label: t.matricula,
      color: COR_ESTADO.disponivel,
    })),
    ...(origemCoords
      ? [{ id: "origem",  lon: origemCoords.lon,  lat: origemCoords.lat,  label: "Origem",  color: "#2563eb" }]
      : []),
    ...(destinoCoords
      ? [{ id: "destino", lon: destinoCoords.lon, lat: destinoCoords.lat, label: "Destino", color: "#7c3aed" }]
      : []),
  ];

  // Centro do mapa — se origem definida, centra lá
  const mapCenter = origemCoords
    ? [origemCoords.lon, origemCoords.lat]
    : [-9.1393, 38.7223];

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

    setStep("confirmacao");
  }

  function confirmarPedido() {
    setLoading(true);
    // Simula envio para API (quando o backend estiver pronto substitui por pedidoService.create)
    setTimeout(() => {
      setLoading(false);
      setStep("aguardar");
    }, 1200);
  }

  function cancelar() {
    setStep("form");
    setOrigemInput("");
    setDestinoInput("");
    setOrigemCoords(null);
    setDestinoCoords(null);
    setErro("");
  }

  return (
    <div className={styles.root}>
      {/* Painel lateral */}
      <aside className={styles.sidebar}>

        {step === "form" && (
          <>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.title}>Pedir táxi</h2>
              <p className={styles.subtitle}>Introduz a tua rota</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Origem */}
              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldDot} style={{ background: "#2563eb" }} />
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
                  <span className={styles.fieldDot} style={{ background: "#7c3aed" }} />
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

              {/* Nível de conforto */}
              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel}>Nível de conforto</label>
                <div className={styles.confortoGrid}>
                  {CONFORTO_OPTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.confortoBtn} ${conforto === c ? styles.confortoBtnAtivo : ""}`}
                      onClick={() => setConforto(c)}
                    >
                      {c}
                    </button>
                  ))}
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
              {TAXIS_MOCK.filter((t) => t.estado === "disponivel").map((t) => (
                <div key={t.id} className={styles.legendaItem}>
                  <div className={styles.legendaDot} style={{ background: COR_ESTADO.disponivel }} />
                  <span>{t.matricula} · {t.nivel_conforto}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {step === "confirmacao" && (
          <div className={styles.confirmacao}>
            <h2 className={styles.title}>Confirmar pedido</h2>

            <div className={styles.rotaCard}>
              <div className={styles.rotaItem}>
                <div className={styles.rotaDot} style={{ background: "#2563eb" }} />
                <div>
                  <div className={styles.rotaLabel}>Origem</div>
                  <div className={styles.rotaVal}>{origemInput}</div>
                </div>
              </div>
              <div className={styles.rotaLine} />
              <div className={styles.rotaItem}>
                <div className={styles.rotaDot} style={{ background: "#7c3aed" }} />
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
              <span className={styles.metaLabel}>Conforto</span>
              <span>{conforto}</span>
            </div>

            <button
              className={styles.submitBtn}
              onClick={confirmarPedido}
              disabled={loading}
            >
              {loading ? "A enviar…" : "Confirmar pedido →"}
            </button>
            <button className={styles.cancelBtn} onClick={cancelar}>
              Cancelar
            </button>
          </div>
        )}

        {step === "aguardar" && (
          <div className={styles.aguardar}>
            <div className={styles.aguardarIcon}>⏳</div>
            <h2 className={styles.title}>À espera de motorista</h2>
            <p className={styles.subtitle}>O teu pedido foi enviado. Um motorista irá responder em breve.</p>
            <button className={styles.cancelBtn} style={{ marginTop: "1.5rem" }} onClick={cancelar}>
              Cancelar pedido
            </button>
          </div>
        )}
      </aside>

      {/* Mapa */}
      <div className={styles.mapaWrap}>
        <MapaBase
          markers={markers}
          height="100%"
          center={mapCenter}
          zoom={origemCoords ? 15 : 13}
        />
      </div>
    </div>
  );
}