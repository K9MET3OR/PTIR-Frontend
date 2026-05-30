import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { criarShift } from '../../services/shiftService';
import { api } from '../../services/api';
import styles from './IniciarTurnoPage.module.css';

function combinarDataHora(data, hora) {
  if (!data || !hora) return null;
  const dt = new Date(`${data}T${hora}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function arredondarHoraAtual() {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function arredondarHoraInicio() {
  const agora = new Date();
  agora.setSeconds(0, 0);
  agora.setMinutes(agora.getMinutes() + 5);

  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function formatarDataLocal(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
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
  const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;

  return { dataFim, horaFim };
}

export default function IniciarTurnoPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    carregarTurnos();
  }, []);

  function calcularDuracaoHoras() {
    const inicio = combinarDataHora(dataInicio, horaInicio);
    const fim = combinarDataHora(dataFim, horaFim);

    if (!inicio || !fim) return 0;
    return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
  }

  function validarPeriodo(mostrarErro = true) {
    const inicio = combinarDataHora(dataInicio, horaInicio);
    const fim = combinarDataHora(dataFim, horaFim);

    if (!inicio || !fim) {
      if (mostrarErro) setErro('Preenche corretamente as datas e horas.');
      return false;
    }

    if (inicio >= fim) {
      if (mostrarErro) {
        setErro('A data/hora de fim deve ser posterior à data/hora de início.');
      }
      return false;
    }

    const duracao = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    if (duracao > 8) {
      if (mostrarErro) setErro('Um turno não pode durar mais de 8 horas.');
      return false;
    }

    if (duracao <= 0) {
      if (mostrarErro) setErro('Seleciona um período válido.');
      return false;
    }

    const agora = new Date();
    agora.setSeconds(0, 0);

    if (inicio < agora) {
      if (mostrarErro) {
        setErro('Não é possível iniciar um turno num período já passado.');
      }
      return false;
    }

    return true;
  }

  async function carregarTaxisDisponiveis() {
    if (!validarPeriodo(true)) return;

    setLoading(true);
    setErro('');
    setTaxis([]);

    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const data = await api.get(
        `/shift/taxis-disponiveis/?start_date=${encodeURIComponent(inicio.toISOString())}&end_date=${encodeURIComponent(fim.toISOString())}`
      );

      setTaxis(data.taxis || []);
      setTaxiSelecionado(null);
    } catch (error) {
      console.error('Erro ao carregar táxis:', error);
      setErro(error.message || 'Erro ao carregar táxis disponíveis.');
    } finally {
      setLoading(false);
    }
  }

  async function carregarTurnos() {
    try {
      const data = await api.get(`/shift/driver/${user.id}`);
      setTurnos(data.shifts || []);
    } catch (error) {
      console.error('Erro ao carregar turnos:', error);
    }
  }

  async function handleIniciarTurno() {
    if (!taxiSelecionado) {
      setErro('Por favor, seleciona um táxi para iniciar o turno.');
      return;
    }

    if (!validarPeriodo(true)) return;

    setProcessando(true);
    setErro('');

    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const data = await criarShift({
        driverId: user.id,
        taxiId: taxiSelecionado.id,
        startDate: inicio.toISOString(),
        endDate: fim.toISOString(),
      });

      const shift = data?.shift ?? null;
      const shiftId = shift?.id ?? data?.id ?? data?.shiftId;

      if (shiftId && shift?.status_shift === 'active') {
        localStorage.setItem('turno_id', String(shiftId));
        localStorage.setItem('turno_ativo', 'true');
      }

      await carregarTurnos();

      const novoHoje = formatarDataLocal(new Date());
      const novaHoraAtual = arredondarHoraAtual();
      const novoFimPorDefeito = calcularFimPorDefeito(novoHoje, novaHoraAtual);

      setTaxiSelecionado(null);
      setDataInicio(novoHoje);
      setHoraInicio(novaHoraAtual);
      setDataFim(novoFimPorDefeito.dataFim);
      setHoraFim(novoFimPorDefeito.horaFim);
      setTaxis([]);
      setErro('');
    } catch (error) {
      console.error('Erro ao iniciar turno:', error);
      setErro(error.message || 'Erro ao iniciar turno.');
    } finally {
      setProcessando(false);
    }
  }

  const duracao = calcularDuracaoHoras();
  const duracaoValida = duracao > 0 && duracao <= 8;
  const periodoValido = validarPeriodo(false);

  const agora = new Date();

  const turnoAtual = turnos.find((shift) => {
    const inicio = new Date(shift.start_date);
    const fim = new Date(shift.end_date);

    return (
      shift.status_shift !== 'inactive' &&
      inicio <= agora &&
      agora < fim
    );
  });

  useEffect(() => {
    if (!turnoAtual) {
      localStorage.removeItem('turno_id');
      localStorage.removeItem('turno_ativo');
    }
  }, [turnoAtual]);

  const proximosTurnos = turnos
    .filter((shift) => {
      const inicio = new Date(shift.start_date);
      return shift.status_shift !== 'inactive' && inicio > agora;
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

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
                  <label className={styles.fieldLabel}>Data</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Hora</label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.periodoColuna}>
                <div className={styles.periodoTitulo}>Fim</div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Data</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Hora</label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.infoBox}>
              <p>
                <strong>Duração:</strong>{' '}
                {duracao > 0 ? `${duracao.toFixed(2)} horas` : 'Período inválido'}
                {duracao <= 0 && (
                  <span className={styles.alertaErro}> (o fim tem de ser posterior ao início)</span>
                )}
                {duracao > 8 && <span className={styles.alertaErro}> (máximo 8 horas)</span>}
                {duracaoValida && <span className={styles.alertaSucesso}> ✓</span>}
              </p>
            </div>

            <button
              onClick={carregarTaxisDisponiveis}
              disabled={loading || !periodoValido}
              className={styles.btnPrimario}
            >
              {loading ? '⏳ A carregar...' : '🔍 Ver Táxis Disponíveis'}
            </button>
          </div>

          {taxis.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Selecionar Táxi</h2>
              <p className={styles.description}>Escolhe um dos táxis disponíveis para este período</p>

              <div className={styles.gridTaxis}>
                {taxis.map((taxi) => (
                  <div
                    key={taxi.id}
                    className={`${styles.taxiCard} ${taxiSelecionado?.id === taxi.id ? styles.taxiCardSelecionado : ''}`}
                    onClick={() => setTaxiSelecionado(taxi)}
                  >
                    <div className={styles.taxiIcon}>🚕</div>
                    <div className={styles.taxiInfo}>
                      <h3 className={styles.taxiMatricula}>{taxi.matricula}</h3>
                      <p className={styles.taxiModelo}>
                        {taxi.marca} {taxi.modelo}
                      </p>
                      <div className={styles.taxiMeta}>
                        <span className={styles.taxiConforto}>{taxi.nivel_conforto}</span>
                      </div>
                    </div>
                    {taxiSelecionado?.id === taxi.id && <div className={styles.selecionado}>✓</div>}
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
                  <span className={styles.valor}>{dataInicio} {horaInicio}</span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Fim:</span>
                  <span className={styles.valor}>{dataFim} {horaFim}</span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Táxi:</span>
                  <span className={styles.valor}>{taxiSelecionado.matricula}</span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Veículo:</span>
                  <span className={styles.valor}>{taxiSelecionado.marca} {taxiSelecionado.modelo}</span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Turno Atual</h2>

            {turnoAtual ? (
              <div className={styles.turnoItem}>
                <div className={styles.turnoData}>
                  {new Date(turnoAtual.start_date).toLocaleDateString('pt-PT')}
                </div>
                <div className={styles.turnoHora}>
                  {new Date(turnoAtual.start_date).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -
                  {new Date(turnoAtual.end_date).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className={styles.turnoTaxi}>
                  {turnoAtual.taxi_matricula
                    ? `${turnoAtual.taxi_matricula} · ${turnoAtual.taxi_marca} ${turnoAtual.taxi_modelo}`
                    : turnoAtual.taxi_id}
                </div>
              </div>
            ) : (
              <p className={styles.description}>Não tens nenhum turno ativo neste momento.</p>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Próximos Turnos</h2>

            {proximosTurnos.length > 0 ? (
              <div className={styles.turnosList}>
                {proximosTurnos.map((turno) => (
                  <div key={turno.id} className={styles.turnoItem}>
                    <div className={styles.turnoData}>
                      {new Date(turno.start_date).toLocaleDateString('pt-PT')}
                    </div>
                    <div className={styles.turnoHora}>
                      {new Date(turno.start_date).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -
                      {new Date(turno.end_date).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className={styles.turnoTaxi}>
                      {turno.taxi_matricula
                        ? `${turno.taxi_matricula} · ${turno.taxi_marca} ${turno.taxi_modelo}`
                        : turno.taxi_id}
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
            onClick={() => navigate('/motorista/mapa')}
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
            {processando ? '⏳ A iniciar...' : '🚀 Iniciar Turno Agora'}
          </button>
        </div>
      </div>
    </div>
  );
}