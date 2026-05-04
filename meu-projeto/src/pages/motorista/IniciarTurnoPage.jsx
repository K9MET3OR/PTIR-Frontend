import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { criarShift } from '../../services/shiftService';
import { api } from '../../services/api';
import styles from './IniciarTurnoPage.module.css';

export default function IniciarTurnoPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('17:00');

  const [taxis, setTaxis] = useState([]);
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    carregarTaxisDisponiveis();
    carregarTurnos();
  }, []);

  // Calcular duração em horas
  const calcularDuracao = (hora1, hora2) => {
    const [h1, m1] = hora1.split(':').map(Number);
    const [h2, m2] = hora2.split(':').map(Number);
    const minutos1 = h1 * 60 + m1;
    const minutos2 = h2 * 60 + m2;
    const duracaoMinutos = minutos2 - minutos1;
    return Math.floor(duracaoMinutos / 60);
  };

  // Validar duração
  const validarDuracao = () => {
    const duracao = calcularDuracao(horaInicio, horaFim);

    if (horaInicio >= horaFim) {
      setErro('A hora de fim deve ser posterior à hora de início.');
      return false;
    }

    if (duracao > 8) {
      setErro('Um turno não pode durar mais de 8 horas.');
      return false;
    }

    if (duracao <= 0) {
      setErro('Seleciona um período válido.');
      return false;
    }

    return true;
  };

  const carregarTaxisDisponiveis = async () => {
    if (!dataInicio || !horaInicio || !horaFim) {
      setErro('Preenche a data e horas.');
      return;
    }

    if (!validarDuracao()) {
      return;
    }

    setLoading(true);
    setErro('');
    setTaxis([]);

    try {
      const dataHoraInicio = `${dataInicio}T${horaInicio}:00Z`;
      const dataHoraFim = `${dataInicio}T${horaFim}:00Z`;

      const data = await api.get(
        `/shift/taxis-available/?start_date=${encodeURIComponent(dataHoraInicio)}&end_date=${encodeURIComponent(dataHoraFim)}`
      );

      setTaxis(data.taxis || []);
      setTaxiSelecionado(null);
    } catch (error) {
      console.error('Erro ao carregar táxis:', error);
      setErro('Erro ao carregar táxis disponíveis.');
    } finally {
      setLoading(false);
    }
  };

  const carregarTurnos = async () => {
    try {
      const data = await api.get(`/shift/driver/${user.id}`);
      setTurnos(data.shifts || []);
    } catch (error) {
      console.error('Erro ao carregar turnos:', error);
    }
  };

  const handleIniciarTurno = async () => {
    if (!taxiSelecionado) {
      setErro('Por favor, seleciona um táxi para iniciar o turno.');
      return;
    }

    if (!validarDuracao()) {
      return;
    }

    setProcessando(true);
    setErro('');

    try {
      const dataHoraInicio = `${dataInicio}T${horaInicio}:00Z`;
      const dataHoraFim = `${dataInicio}T${horaFim}:00Z`;

      const data = await criarShift({
        driverId: user.id,
        taxiId: taxiSelecionado.id,
        startDate: dataHoraInicio,
        endDate: dataHoraFim,
      });

      // Guardar turno_id e turno_ativo no localStorage
      if (data.shift && data.shift.id) {
        localStorage.setItem('turno_id', data.shift.id);
        localStorage.setItem('turno_ativo', 'true');
      }

      await carregarTurnos();

      // Limpar formulário
      setTaxiSelecionado(null);
      setDataInicio(new Date().toISOString().split('T')[0]);
      setHoraInicio('09:00');
      setHoraFim('17:00');
      setErro('');

      setTimeout(() => {
        navigate('/motorista/mapa', { replace: true });
      }, 1500);
    } catch (error) {
      console.error('Erro ao iniciar turno:', error);
      setErro(error.message || 'Erro ao iniciar turno.');
    } finally {
      setProcessando(false);
    }
  };

  const duracao = calcularDuracao(horaInicio, horaFim);
  const duracaoValida = horaInicio < horaFim && duracao <= 8 && duracao > 0;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Iniciar Turno</h1>
          <p className={styles.subtitle}>Bem-vindo, {user?.name || user?.email}!</p>
        </div>

        {erro && <div className={styles.erro}>{erro}</div>}

        <div className={styles.content}>
          {/* Seção: Definir Período */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>� Definir Período do Turno</h2>
            <p className={styles.description}>
              Máximo 8 horas por turno
            </p>

            <div className={styles.formGrid}>
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
                <label className={styles.fieldLabel}>Hora de Início</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Hora de Fim</label>
                <input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.infoBox}>
              <p>
                <strong>Duração:</strong> {duracao} horas
                {duracao > 8 && <span className={styles.alertaErro}> (máximo 8 horas)</span>}
                {duracaoValida && <span className={styles.alertaSucesso}> ✓</span>}
              </p>
            </div>

            <button
              onClick={carregarTaxisDisponiveis}
              disabled={loading || !duracaoValida}
              className={styles.btnPrimario}
            >
              {loading ? '⏳ A carregar...' : '🔍 Ver Táxis Disponíveis'}
            </button>
          </div>

          {/* Seção: Selecionar Táxi */}
          {taxis.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🚕 Selecionar Táxi</h2>
              <p className={styles.description}>
                Escolhe um dos táxis disponíveis para este período
              </p>

              <div className={styles.gridTaxis}>
                {taxis.map(taxi => (
                  <div
                    key={taxi.id}
                    className={`${styles.taxiCard} ${taxiSelecionado?.id === taxi.id ? styles.taxiCardSelecionado : ''
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

          {/* Seção: Resumo */}
          {taxiSelecionado && duracaoValida && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>✅ Resumo do Turno</h2>
              <div className={styles.resumo}>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Data:</span>
                  <span className={styles.valor}>{dataInicio}</span>
                </div>
                <div className={styles.resumoItem}>
                  <span className={styles.label}>Período:</span>
                  <span className={styles.valor}>{horaInicio} - {horaFim} ({duracao}h)</span>
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

          {/* Seção: Meus Turnos */}
          {turnos.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>📋 Meus Turnos</h2>
              <div className={styles.turnosList}>
                {turnos.slice(0, 3).map(turno => (
                  <div key={turno.id} className={styles.turnoItem}>
                    <div className={styles.turnoData}>
                      {new Date(turno.start_date).toLocaleDateString('pt-PT')}
                    </div>
                    <div className={styles.turnoHora}>
                      {new Date(turno.start_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(turno.end_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
            disabled={!taxiSelecionado || !duracaoValida || processando}
          >
            {processando ? '⏳ A iniciar...' : '🚀 Iniciar Turno Agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
