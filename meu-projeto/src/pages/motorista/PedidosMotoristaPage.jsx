import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import {
  listarViagensPendentes,
  aceitarViagem,
  listarViagensAceitesMotorista,
} from "../../services/tripService";
import styles from "./PedidosMotoristaPage.module.css";

export default function PedidosMotoristaPage() {
  const navigate = useNavigate();
  const feedback = useFeedback();
  const { user } = useContext(AuthContext);

  const [tab, setTab] = useState("pendentes");
  const [viagensPendentes, setViagensPendentes] = useState([]);
  const [viagensAceites, setViagensAceites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregandoId, setCarregandoId] = useState(null);
  const [viagensIgnoradas, setViagensIgnoradas] = useState([]);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user]);

  const carregarDados = async () => {
    setLoading(true);
    setErro("");
    setSucesso("");

    try {
      if (tab === "pendentes") {
        const data = await listarViagensPendentes();
        setViagensPendentes(data.trips || []);
      } else if (tab === "aceites" && user) {
        const data = await listarViagensAceitesMotorista(user.id);
        setViagensAceites(data.trips || []);
      }
    } catch (error) {
      const message = error.message || "Erro ao carregar dados.";
      setErro(message);
      feedback.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAceitarViagem = async (tripId) => {
    setErro("");
    setSucesso("");

    if (!user?.id) {
      const message = "Não foi possível identificar o motorista.";
      setErro(message);
      feedback.error(message);
      return;
    }

    try {
      setCarregandoId(tripId);

      await aceitarViagem(tripId, user.id);

      const message = "Viagem aceite com sucesso.";
      setSucesso(message);
      feedback.success(message);

      await carregarDados();
    } catch (error) {
      console.error("Erro ao aceitar viagem:", error);

      const message = error.message || "Erro ao aceitar viagem.";
      setErro(message);
      feedback.error(message);
    } finally {
      setCarregandoId(null);
    }
  };

  const handleIgnorarViagem = (tripId) => {
    setViagensIgnoradas((prev) => [...prev, tripId]);

    const message = "Pedido ignorado.";
    setSucesso(message);
    setErro("");
    feedback.info(message);
  };

  const handleMudarTab = (novaTab) => {
    setTab(novaTab);
    setErro("");
    setSucesso("");
  };

  const formatarData = (dataISO) => {
    if (!dataISO) return "-";

    const data = new Date(dataISO);

    if (Number.isNaN(data.getTime())) {
      return "-";
    }

    return data.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const viagensPendentesVisiveis = viagensPendentes.filter(
    (viagem) => !viagensIgnoradas.includes(viagem.id)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pedidos de Viagem</h1>
        <p>Gere as tuas viagens</p>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}
      {sucesso && <div className={styles.sucesso}>{sucesso}</div>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "pendentes" ? styles.tabAtivo : ""}`}
          onClick={() => handleMudarTab("pendentes")}
        >
          Pedidos Pendentes
        </button>

        <button
          className={`${styles.tab} ${tab === "aceites" ? styles.tabAtivo : ""}`}
          onClick={() => handleMudarTab("aceites")}
        >
          As Minhas Viagens
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>A carregar...</div>
        ) : tab === "pendentes" ? (
          <div className={styles.list}>
            {viagensPendentesVisiveis.length === 0 ? (
              <div className={styles.vazio}>
                <p>Não há viagens pendentes neste momento</p>
              </div>
            ) : (
              viagensPendentesVisiveis.map((viagem) => (
                <div key={viagem.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.rota}>
                      <div className={styles.rotaItem}>
                        <div
                          className={styles.dot}
                          style={{ background: "#a855f7" }}
                        />
                        <div className={styles.local}>{viagem.start_location}</div>
                      </div>

                      <div className={styles.arrow}>→</div>

                      <div className={styles.rotaItem}>
                        <div
                          className={styles.dot}
                          style={{ background: "#c084fc" }}
                        />
                        <div className={styles.local}>{viagem.end_location}</div>
                      </div>
                    </div>

                    <div className={styles.preço}>{viagem.price} €</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>
                      👤 {viagem.n_people} pessoa{viagem.n_people > 1 ? "s" : ""}
                    </span>
                    <span>📏 {viagem.n_kms} km</span>
                    <span>⏱️ {formatarData(viagem.start_date)}</span>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={`${styles.btn} ${styles.btnRejeitar}`}
                      onClick={() => handleIgnorarViagem(viagem.id)}
                      disabled={carregandoId === viagem.id}
                    >
                      Ignorar
                    </button>

                    <button
                      className={`${styles.btn} ${styles.btnAceitar}`}
                      onClick={() => handleAceitarViagem(viagem.id)}
                      disabled={carregandoId === viagem.id}
                    >
                      {carregandoId === viagem.id ? "A processar..." : "Aceitar"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {viagensAceites.length === 0 ? (
              <div className={styles.vazio}>
                <p>Ainda não tens nenhuma viagem aceite</p>
              </div>
            ) : (
              viagensAceites.map((viagem) => (
                <div key={viagem.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.rota}>
                      <div className={styles.rotaItem}>
                        <div
                          className={styles.dot}
                          style={{ background: "#a855f7" }}
                        />
                        <div className={styles.local}>{viagem.start_location}</div>
                      </div>

                      <div className={styles.arrow}>→</div>

                      <div className={styles.rotaItem}>
                        <div
                          className={styles.dot}
                          style={{ background: "#c084fc" }}
                        />
                        <div className={styles.local}>{viagem.end_location}</div>
                      </div>
                    </div>

                    <div className={styles.preço}>{viagem.price} €</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>
                      👤 {viagem.n_people} pessoa{viagem.n_people > 1 ? "s" : ""}
                    </span>
                    <span>📏 {viagem.n_kms} km</span>
                    <span>⏱️ {formatarData(viagem.start_date)}</span>

                    <span className={styles.status}>
                      {viagem.status_trip === "accepted" ? "🔄 Aceite" : "🚗 Em Progresso"}
                    </span>

                    {viagem.status_trip === "accepted" && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimario}`}
                        onClick={() => navigate(`/motorista/viagem?trip=${viagem.id}`)}
                      >
                        Registar Viagem
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}