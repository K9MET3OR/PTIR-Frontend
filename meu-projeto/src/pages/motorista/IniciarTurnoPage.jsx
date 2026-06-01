import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { criarShift, cancelarShift } from "../../services/shiftService";
import { api } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import { useConfirm } from "../../context/ConfirmContext";
import styles from "./IniciarTurnoPage.module.css";

function combinarDataHora(data, hora) {
  if (!data || !hora) return null;
  const dt = new Date(`${data}T${hora}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function arredondarHoraAtual() {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

function arredondarHoraInicio() {
  const agora = new Date();
  agora.setSeconds(0, 0);
  agora.setMinutes(agora.getMinutes() + 1);

  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

function formatarDataLocal(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function calcularFimPorDefeito(data, hora) {
  const inicio = combinarDataHora(data, hora);

  if (!inicio) {
    return { dataFim: data, horaFim: hora };
  }

  const fim = new Date(inicio);
  fim.setHours(fim.getHours() + 1);

  const dataFim = formatarDataLocal(fim);
  const horaFim = `${String(fim.getHours()).padStart(2, "0")}:${String(
    fim.getMinutes()
  ).padStart(2, "0")}`;

  return { dataFim, horaFim };
}

function formatarTempo(ms) {
  const totalMs = Math.max(0, Number(ms) || 0);
  const totalSegundos = Math.floor(totalMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return `${horas}h ${minutos}m ${segundos}s`;
}

function formatarDuracaoMs(ms) {
  if (!ms || ms <= 0) return "Período inválido";

  const totalMinutos = Math.round(ms / 60000);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if (horas === 0) {
    return `${minutos}m`;
  }

  if (minutos === 0) {
    return `${horas}h`;
  }

  return `${horas}h ${minutos}m`;
}

function obterErroPeriodo(dataInicio, horaInicio, dataFim, horaFim) {
  const inicio = combinarDataHora(dataInicio, horaInicio);
  const fim = combinarDataHora(dataFim, horaFim);

  if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
    return "Preenche corretamente as datas e horas.";
  }

  if (!inicio || !fim) {
    return "As datas e horas selecionadas são inválidas.";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const agora = new Date();
  agora.setSeconds(0, 0);

  const inicioDia = new Date(inicio);
  inicioDia.setHours(0, 0, 0, 0);

  const fimDia = new Date(fim);
  fimDia.setHours(0, 0, 0, 0);

  if (inicioDia < hoje) {
    return "A data de início já passou. Escolhe uma data igual ou posterior a hoje.";
  }

  if (fimDia < hoje) {
    return "A data de fim já passou. Escolhe uma data igual ou posterior a hoje.";
  }

  if (inicio < agora) {
    return "A hora de início já passou. Escolhe uma hora posterior à hora atual.";
  }

  if (fim <= inicio) {
    return "A data/hora de fim deve ser posterior à data/hora de início.";
  }

  const duracaoMs = fim.getTime() - inicio.getTime();
  const oitoHorasMs = 8 * 60 * 60 * 1000;

  if (duracaoMs > oitoHorasMs) {
    return "Um turno não pode durar mais de 8 horas.";
  }

  return null;
}

function turnoComecaAgoraOuEmBreve(turno) {
  if (!turno) return false;

  const agora = new Date();
  const limite = new Date(agora.getTime() + 5 * 60 * 1000);

  const inicio = new Date(turno.start_date || turno.startDate || turno.start || turno.inicio);
  const fim = new Date(turno.end_date || turno.endDate || turno.end || turno.fim);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return false;
  }

  return inicio <= limite && fim > agora;
}

function turnoEstaAtivoAgora(turno) {
  if (!turno) return false;

  const agora = new Date();
  const inicio = new Date(turno.start_date || turno.startDate || turno.start || turno.inicio);
  const fim = new Date(turno.end_date || turno.endDate || turno.end || turno.fim);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return false;
  }

  return turno.status_shift !== "inactive" && inicio <= agora && agora < fim;
}

export default function IniciarTurnoPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const feedback = useFeedback();
  const confirm = useConfirm();

  const hoje = formatarDataLocal(new Date());
  const horaAtual = arredondarHoraInicio();
  const fimPorDefeito = calcularFimPorDefeito(hoje, horaAtual);

  const [dataInicio, setDataInicio] = useState(hoje);
  const [horaInicio, setHoraInicio] = useState(horaAtual);
  const [dataFim, setDataFim] = useState(fimPorDefeito.dataFim);
  const [horaFim, setHoraFim] = useState(fimPorDefeito.horaFim);

  const [taxis, setTaxis] = useState([]);
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [turnos, setTurnos] = useState([]);
  const [tempoAteProximoTurno, setTempoAteProximoTurno] = useState(0);

  useEffect(() => {
    carregarTurnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function calcularDuracaoMs() {
    const inicio = combinarDataHora(dataInicio, horaInicio);
    const fim = combinarDataHora(dataFim, horaFim);

    if (!inicio || !fim) return 0;

    return fim.getTime() - inicio.getTime();
  }

  function validarPeriodo(mostrarErro = true) {
    const erroPeriodo = obterErroPeriodo(dataInicio, horaInicio, dataFim, horaFim);

    if (erroPeriodo) {
      if (mostrarErro) {
        setErro(erroPeriodo);
        feedback.warning(erroPeriodo);
      }

      return false;
    }

    if (mostrarErro) {
      setErro("");
    }

    return true;
  }

  function atualizarDataInicio(value) {
    setDataInicio(value);
    setTaxis([]);
    setTaxiSelecionado(null);

    const erroPeriodo = obterErroPeriodo(value, horaInicio, dataFim, horaFim);
    setErro(erroPeriodo || "");
  }

  function atualizarHoraInicio(value) {
    setHoraInicio(value);
    setTaxis([]);
    setTaxiSelecionado(null);

    const erroPeriodo = obterErroPeriodo(dataInicio, value, dataFim, horaFim);
    setErro(erroPeriodo || "");
  }

  function atualizarDataFim(value) {
    setDataFim(value);
    setTaxis([]);
    setTaxiSelecionado(null);

    const erroPeriodo = obterErroPeriodo(dataInicio, horaInicio, value, horaFim);
    setErro(erroPeriodo || "");
  }

  function atualizarHoraFim(value) {
    setHoraFim(value);
    setTaxis([]);
    setTaxiSelecionado(null);

    const erroPeriodo = obterErroPeriodo(dataInicio, horaInicio, dataFim, value);
    setErro(erroPeriodo || "");
  }

  async function carregarTaxisDisponiveis() {
    if (!validarPeriodo(true)) return;

    setLoading(true);
    setErro("");
    setTaxis([]);

    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const data = await api.get(
        `/shift/taxis-disponiveis/?start_date=${encodeURIComponent(
          inicio.toISOString()
        )}&end_date=${encodeURIComponent(fim.toISOString())}`
      );

      const taxisDisponiveis = data.taxis || [];

      setTaxis(taxisDisponiveis);
      setTaxiSelecionado(null);

      if (taxisDisponiveis.length > 0) {
        feedback.success(
          `${taxisDisponiveis.length} táxi${
            taxisDisponiveis.length !== 1 ? "s" : ""
          } disponível${taxisDisponiveis.length !== 1 ? "eis" : ""} para este período.`
        );
      } else {
        feedback.info("Não existem táxis disponíveis para este período.");
      }
    } catch (error) {
      console.error("Erro ao carregar táxis:", error);

      const message = error.message || "Erro ao carregar táxis disponíveis.";
      setErro(message);
      feedback.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarTurnos() {
    if (!user?.id) return;

    try {
      const data = await api.get(`/shift/driver/${user.id}`);
      setTurnos(data.shifts || []);
    } catch (error) {
      console.error("Erro ao carregar turnos:", error);
      feedback.error("Erro ao carregar turnos do motorista.");
    }
  }

  async function handleIniciarTurno() {
    if (!taxiSelecionado) {
      const message = "Por favor, seleciona um táxi para iniciar o turno.";
      setErro(message);
      feedback.warning(message);
      return;
    }

    if (!validarPeriodo(true)) return;

    setProcessando(true);
    setErro("");

    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const data = await criarShift({
        driverId: user.id,
        taxiId: taxiSelecionado.id,
        startDate: inicio.toISOString(),
        endDate: fim.toISOString(),
      });

      const shift = data?.shift ?? data ?? null;
      const shiftId = shift?.id ?? data?.id ?? data?.shiftId;

      const turnoCriado = {
        ...(shift || {}),
        id: shiftId,
        start_date: shift?.start_date || shift?.startDate || inicio.toISOString(),
        end_date: shift?.end_date || shift?.endDate || fim.toISOString(),
      };

      if (shiftId && turnoEstaAtivoAgora(turnoCriado)) {
        localStorage.setItem("turno_id", String(shiftId));
        localStorage.setItem("turno_ativo", "true");
      }

      await carregarTurnos();

      if (turnoComecaAgoraOuEmBreve(turnoCriado)) {
        feedback.success("Turno iniciado com sucesso.");
        navigate("/motorista/mapa", { replace: true });
        return;
      }

      const novoHoje = formatarDataLocal(new Date());
      const novaHoraAtual = arredondarHoraAtual();
      const novoFimPorDefeito = calcularFimPorDefeito(novoHoje, novaHoraAtual);

      setTaxiSelecionado(null);
      setDataInicio(novoHoje);
      setHoraInicio(novaHoraAtual);
      setDataFim(novoFimPorDefeito.dataFim);
      setHoraFim(novoFimPorDefeito.horaFim);
      setTaxis([]);
      setErro("");

      feedback.success("Turno agendado com sucesso.");
    } catch (error) {
      console.error("Erro ao iniciar turno:", error);

      const message = error.message || "Erro ao iniciar turno.";
      setErro(message);
      feedback.error(message);
    } finally {
      setProcessando(false);
    }
  }

  async function handleCancelarTurno(shiftId) {
    const confirmar = await confirm({
      title: "Cancelar turno",
      message:
        "Tens a certeza que queres cancelar este turno agendado? Esta ação remove o turno da tua lista de próximos turnos.",
      confirmText: "Cancelar turno",
      cancelText: "Manter turno",
      variant: "danger",
    });

    if (!confirmar) return;

    try {
      await cancelarShift(shiftId);
      await carregarTurnos();
      feedback.success("Turno cancelado com sucesso.");
    } catch (error) {
      console.error("Erro ao cancelar turno:", error);

      const message = error.message || "Erro ao cancelar turno.";
      setErro(message);
      feedback.error(message);
    }
  }

  const duracaoMs = calcularDuracaoMs();
  const duracaoValida = duracaoMs > 0 && duracaoMs <= 8 * 60 * 60 * 1000;
  const periodoValido = !obterErroPeriodo(dataInicio, horaInicio, dataFim, horaFim);
  const erroPeriodoAtual = obterErroPeriodo(dataInicio, horaInicio, dataFim, horaFim);

  const agora = new Date();

  const turnoAtual = turnos.find((shift) => {
    const inicio = new Date(shift.start_date);
    const fim = new Date(shift.end_date);

    return shift.status_shift !== "inactive" && inicio <= agora && agora < fim;
  });

  useEffect(() => {
    if (!turnoAtual) {
      localStorage.removeItem("turno_id");
      localStorage.removeItem("turno_ativo");
    }
  }, [turnoAtual]);

  const proximosTurnos = turnos
    .filter((shift) => {
      const inicio = new Date(shift.start_date);
      return shift.status_shift !== "inactive" && inicio > agora;
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const proximoTurno = proximosTurnos[0] || null;

  useEffect(() => {
    if (turnoAtual || !proximoTurno) {
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
        carregarTurnos();
        return;
      }

      setTempoAteProximoTurno(diferenca);
    }

    atualizarCountdownProximoTurno();

    const interval = setInterval(atualizarCountdownProximoTurno, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnoAtual, proximoTurno?.id, proximoTurno?.start_date]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Iniciar Turno</h1>
          <p className={styles.subtitle}>Bem-vindo, {user?.name || user?.email}!</p>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Definir Período do Turno</h2>
            <p className={styles.description}>Máximo 8 horas por turno</p>

            <div className={styles.periodoGrid}>
              <div className={styles.periodoColuna}>
                <div className={styles.periodoTitulo}>Início</div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Data de Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    min={hoje}
                    onChange={(e) => atualizarDataInicio(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Hora de Início</label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => atualizarHoraInicio(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.periodoColuna}>
                <div className={styles.periodoTitulo}>Fim</div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Data de Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    min={hoje}
                    onChange={(e) => atualizarDataFim(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Hora de Fim</label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => atualizarHoraFim(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <p>
                <strong>Duração:</strong>{" "}
                {duracaoMs > 0 ? formatarDuracaoMs(duracaoMs) : "Período inválido"}
                {duracaoValida && !erroPeriodoAtual && (
                  <span className={styles.alertaSucesso}> ✓</span>
                )}
              </p>

              {erroPeriodoAtual && (
                <p className={styles.alertaErro}>{erroPeriodoAtual}</p>
              )}
            </div>

            <button
              onClick={carregarTaxisDisponiveis}
              disabled={loading || !periodoValido}
              className={styles.btnPrimario}
            >
              {loading ? "⏳ A carregar..." : "🔍 Ver Táxis Disponíveis"}
            </button>
          </div>

          {taxis.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Selecionar Táxi</h2>
              <p className={styles.description}>
                Escolhe um dos táxis disponíveis para este período
              </p>

              <div className={styles.gridTaxis}>
                {taxis.map((taxi) => (
                  <div
                    key={taxi.id}
                    className={`${styles.taxiCard} ${
                      taxiSelecionado?.id === taxi.id ? styles.taxiCardSelecionado : ""
                    }`}
                    onClick={() => setTaxiSelecionado(taxi)}
                  >
                    <div className={styles.taxiIcon}>🚕</div>
                    <div className={styles.taxiInfo}>
                      <h3 className={styles.taxiMatricula}>{taxi.matricula}</h3>
                      <p className={styles.taxiModelo}>
                        {taxi.marca} {taxi.modelo}
                      </p>
                      <div className={styles.taxiMeta}>
                        <span className={styles.taxiConforto}>
                          {taxi.nivel_conforto}
                        </span>
                      </div>
                    </div>
                    {taxiSelecionado?.id === taxi.id && (
                      <div className={styles.selecionado}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {taxiSelecionado && periodoValido && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Resumo do Turno</h2>
              <div className={styles.resumo}>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Início:</span>
                  <span className={styles.valor}>
                    {dataInicio} {horaInicio}
                  </span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Fim:</span>
                  <span className={styles.valor}>
                    {dataFim} {horaFim}
                  </span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Duração:</span>
                  <span className={styles.valor}>{formatarDuracaoMs(duracaoMs)}</span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Táxi:</span>
                  <span className={styles.valor}>{taxiSelecionado.matricula}</span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Veículo:</span>
                  <span className={styles.valor}>
                    {taxiSelecionado.marca} {taxiSelecionado.modelo}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Turno Atual</h2>

            {turnoAtual ? (
              <div className={styles.turnoItem}>
                <div className={styles.turnoData}>
                  {new Date(turnoAtual.start_date).toLocaleDateString("pt-PT")}
                </div>
                <div className={styles.turnoHora}>
                  {new Date(turnoAtual.start_date).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -
                  {new Date(turnoAtual.end_date).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className={styles.turnoTaxi}>
                  {turnoAtual.taxi_matricula
                    ? `${turnoAtual.taxi_matricula} · ${turnoAtual.taxi_marca} ${turnoAtual.taxi_modelo}`
                    : turnoAtual.taxi_id}
                </div>
              </div>
            ) : (
              <>
                <p className={styles.description}>Não tens nenhum turno ativo neste momento.</p>

                {proximoTurno && (
                  <div className={styles.infoBox}>
                    <p>
                      <strong>Próximo turno começa em:</strong>{" "}
                      <span className={styles.alertaSucesso}>
                        {formatarTempo(tempoAteProximoTurno)}
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Próximos Turnos</h2>

            {proximosTurnos.length > 0 ? (
              <div className={styles.turnosList}>
                {proximosTurnos.map((turno) => (
                  <div key={turno.id} className={styles.turnoItem}>
                    <div className={styles.turnoConteudo}>
                      <div className={styles.turnoData}>
                        {new Date(turno.start_date).toLocaleDateString("pt-PT")}
                      </div>

                      <div className={styles.turnoHora}>
                        {new Date(turno.start_date).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -
                        {new Date(turno.end_date).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>

                      <div className={styles.turnoTaxi}>
                        {turno.taxi_matricula
                          ? `${turno.taxi_matricula} · ${turno.taxi_marca} ${turno.taxi_modelo}`
                          : turno.taxi_id}
                      </div>
                    </div>

                    <div className={styles.turnoAction}>
                      <button
                        type="button"
                        className={styles.btnCancelarTurno}
                        onClick={() => handleCancelarTurno(turno.id)}
                      >
                        Cancelar turno
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.description}>Não tens próximos turnos agendados.</p>
            )}
          </div>
        </div>

        {erro && <div className={styles.erroBottom}>{erro}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancelar}
            onClick={() => navigate("/motorista/mapa")}
            disabled={processando}
          >
            ← Voltar
          </button>
          <button
            type="button"
            className={styles.btnIniciar}
            onClick={handleIniciarTurno}
            disabled={!taxiSelecionado || !periodoValido || processando}
          >
            {processando ? "⏳ A iniciar..." : "🚀 Iniciar Turno Agora"}
          </button>
        </div>
      </div>
    </div>
  );
}