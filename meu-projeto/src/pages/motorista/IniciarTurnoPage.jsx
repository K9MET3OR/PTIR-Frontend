import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { taxiService } from '../../services/taxiService';
import styles from './IniciarTurnoPage.module.css';

export default function IniciarTurnoPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [taxis, setTaxis] = useState([]);
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    carregarTaxis();
  }, []);

  const carregarTaxis = async () => {
    setLoading(true);
    setErro('');
    try {
      const response = await taxiService.list();
      // A API retorna { success: true, taxis: [...], total: N }
      const todosTaxis = response.taxis || [];
      
      // Filtrar apenas táxis disponíveis ou indisponíveis (não ocupados)
      const taxisDisponiveis = todosTaxis.filter(
        taxi => taxi.estado === 'disponivel' || taxi.estado === 'indisponivel'
      );
      setTaxis(taxisDisponiveis);
      
      // Selecionar automaticamente o primeiro táxi se houver apenas um disponível
      if (taxisDisponiveis.length === 1) {
        setTaxiSelecionado(taxisDisponiveis[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar táxis:', error);
      setErro('Erro ao carregar táxis disponíveis. Tenta novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarTurno = async () => {
    if (!taxiSelecionado) {
      setErro('Por favor, seleciona um táxi para iniciar o turno.');
      return;
    }

    setProcessando(true);
    setErro('');

    try {
      // Aqui podes fazer uma chamada para o backend para registar o turno
      // Por enquanto, apenas guardamos no localStorage e navegamos
      const turnoData = {
        motorista_id: user.id,
        taxi_id: taxiSelecionado,
        data_inicio: new Date().toISOString(),
        status: 'ativo',
      };

      localStorage.setItem('turno_ativo', JSON.stringify(turnoData));
      
      // Navegar para a página de pedidos
      navigate('/motorista/pedidos');
    } catch (error) {
      console.error('Erro ao iniciar turno:', error);
      setErro('Erro ao iniciar o turno. Tenta novamente.');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>A carregar táxis disponíveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Iniciar Turno</h1>
          <p className={styles.subtitle}>Bem-vindo, {user?.email}!</p>
        </div>

        {erro && <div className={styles.erro}>{erro}</div>}

        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📋 Seleciona um Táxi</h2>
            <p className={styles.description}>
              Escolhe o táxi com o qual irás trabalhar hoje.
            </p>

            {taxis.length === 0 ? (
              <div className={styles.vazio}>
                <p>Nenhum táxi disponível no momento.</p>
                <button
                  type="button"
                  className={styles.btnRecarregar}
                  onClick={carregarTaxis}
                >
                  🔄 Recarregar
                </button>
              </div>
            ) : (
              <div className={styles.gridTaxis}>
                {taxis.map(taxi => (
                  <div
                    key={taxi.id}
                    className={`${styles.taxiCard} ${
                      taxiSelecionado === taxi.id ? styles.taxiCardSelecionado : ''
                    }`}
                    onClick={() => setTaxiSelecionado(taxi.id)}
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
                        <span
                          className={`${styles.taxiEstado} ${
                            taxi.estado === 'disponivel'
                              ? styles.estadoDisponivel
                              : styles.estadoIndisponivel
                          }`}
                        >
                          {taxi.estado === 'disponivel'
                            ? '✅ Disponível'
                            : '⚠️ Indisponível'}
                        </span>
                      </div>
                    </div>
                    {taxiSelecionado === taxi.id && (
                      <div className={styles.selecionado}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {taxiSelecionado && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>✅ Táxi Selecionado</h2>
              {taxis
                .filter(t => t.id === taxiSelecionado)
                .map(taxi => (
                  <div key={taxi.id} className={styles.resumo}>
                    <div className={styles.resumoItem}>
                      <span className={styles.label}>Matrícula:</span>
                      <span className={styles.valor}>{taxi.matricula}</span>
                    </div>
                    <div className={styles.resumoItem}>
                      <span className={styles.label}>Veículo:</span>
                      <span className={styles.valor}>
                        {taxi.marca} {taxi.modelo}
                      </span>
                    </div>
                    <div className={styles.resumoItem}>
                      <span className={styles.label}>Ano:</span>
                      <span className={styles.valor}>{taxi.ano_compra}</span>
                    </div>
                    <div className={styles.resumoItem}>
                      <span className={styles.label}>Nível de Conforto:</span>
                      <span className={styles.valor}>{taxi.nivel_conforto}</span>
                    </div>
                    <div className={styles.resumoItem}>
                      <span className={styles.label}>Motor:</span>
                      <span className={styles.valor}>{taxi.tipo_motor}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancelar}
            onClick={() => navigate(-1)}
            disabled={processando}
          >
            ← Voltar
          </button>
          <button
            type="button"
            className={styles.btnIniciar}
            onClick={handleIniciarTurno}
            disabled={!taxiSelecionado || processando}
          >
            {processando ? 'A iniciar turno...' : '🚀 Iniciar Turno'}
          </button>
        </div>
      </div>
    </div>
  );
}
