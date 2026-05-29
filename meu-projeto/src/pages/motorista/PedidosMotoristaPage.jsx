import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { listarViagensPendentes, aceitarViagem, listarViagensAceitesMotorista } from '../../services/tripService';
import styles from './PedidosMotoristaPage.module.css';

export default function PedidosMotoristaPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('pendentes'); // 'pendentes' | 'aceites'
  const [viagensPendentes, setViagensPendentes] = useState([]);
  const [viagensAceites, setViagensAceites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregandoId, setCarregandoId] = useState(null);
  const [viagensIgnoradas, setViagensIgnoradas] = useState([]);

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, [tab, user]);

  const carregarDados = async () => {
    setLoading(true);
    setErro('');
    setSucesso('');

    try {
      if (tab === 'pendentes') {
        const data = await listarViagensPendentes();
        setViagensPendentes(data.trips || []);
      } else if (tab === 'aceites' && user) {
        const data = await listarViagensAceitesMotorista(user.id);
        setViagensAceites(data.trips || []);
      }
    } catch (error) {
      setErro(error.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAceitarViagem = async (tripId) => {
    setErro('');
    setSucesso('');
    try {
      setCarregandoId(tripId);
      await aceitarViagem(tripId, user.id);
      setSucesso('Viagem aceite com sucesso.');
      await carregarDados();
    } catch (error) {
      console.error("Erro ao aceitar viagem:", error);
      setErro(error.message || "Erro ao aceitar viagem.");
    } finally {
      setCarregandoId(null);
    }
  };

  const handleIgnorarViagem = (tripId) => {
    setViagensIgnoradas(prev => [...prev, tripId]);
  };

  const formatarData = (dataISO) => {
    if (!dataISO) return '-';
    const data = new Date(dataISO);
    return data.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pedidos de Viagem</h1>
        <p>Gerencia as tuas viagens</p>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}
      {sucesso && <div className={styles.sucesso}>{sucesso}</div>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'pendentes' ? styles.tabAtivo : ''}`}
          onClick={() => setTab('pendentes')}
        >
          Pedidos Pendentes
        </button>
        <button
          className={`${styles.tab} ${tab === 'aceites' ? styles.tabAtivo : ''}`}
          onClick={() => setTab('aceites')}
        >
          As Minhas Viagens
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>A carregar...</div>
        ) : tab === 'pendentes' ? (
          <div className={styles.list}>
            {viagensPendentes.length === 0 ? (
              <div className={styles.vazio}>
                <p>Não há viagens pendentes neste momento</p>
              </div>
            ) : (
              viagensPendentes
                .filter(viagem => !viagensIgnoradas.includes(viagem.id))
                .map(viagem => (
                <div key={viagem.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.rota}>
                      <div className={styles.rotaItem}>
                        <div className={styles.dot} style={{background: '#a855f7'}}></div>
                        <div className={styles.local}>{viagem.start_location}</div>
                      </div>
                      <div className={styles.arrow}>→</div>
                      <div className={styles.rotaItem}>
                        <div className={styles.dot} style={{background: '#c084fc'}}></div>
                        <div className={styles.local}>{viagem.end_location}</div>
                      </div>
                    </div>
                    <div className={styles.preço}>{viagem.price} €</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>👤 {viagem.n_people} pessoa{viagem.n_people > 1 ? 's' : ''}</span>
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
                      {carregandoId === viagem.id ? 'A processar...' : 'Aceitar'}
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
              viagensAceites.map(viagem => (
                <div key={viagem.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.rota}>
                      <div className={styles.rotaItem}>
                        <div className={styles.dot} style={{background: '#a855f7'}}></div>
                        <div className={styles.local}>{viagem.start_location}</div>
                      </div>
                      <div className={styles.arrow}>→</div>
                      <div className={styles.rotaItem}>
                        <div className={styles.dot} style={{background: '#c084fc'}}></div>
                        <div className={styles.local}>{viagem.end_location}</div>
                      </div>
                    </div>
                    <div className={styles.preço}>{viagem.price} €</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>👤 {viagem.n_people} pessoa{viagem.n_people > 1 ? 's' : ''}</span>
                    <span>📏 {viagem.n_kms} km</span>
                    <span>⏱️ {formatarData(viagem.start_date)}</span>
                    <span className={styles.status}>
                      {viagem.status_trip === 'accepted' ? '🔄 Aceite' : '🚗 Em Progresso'}
                    </span>
                    {viagem.status_trip === 'accepted' && (
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
