import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PaymentForm from '../../components/PaymentForm';
import styles from './RegistarViagemPage.module.css';

export default function RegistarViagemPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('taxigest_token');

  // Estados
  const [etapa, setEtapa] = useState('entrada'); // 'entrada', 'saida', 'resumo', 'pagamento'
  const [viagem, setViagem] = useState({
    endereco_inicio: '',
    coordenadas_inicio: null,
    num_pessoas: 1,
    hora_inicio: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    endereco_fim: '',
    coordenadas_fim: null,
    hora_fim: '',
    quilometros: 0,
    preco: 0,
  });

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [processando, setProcessando] = useState(false);

  // Obter localização atual quando carrega a página
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const endereco = await obterEnderecoDosCoordenadas(latitude, longitude);
          setViagem(prev => ({
            ...prev,
            coordenadas_inicio: { latitude, longitude },
            endereco_inicio: endereco
          }));
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          setErro('Não foi possível obter a localização. Preencha manualmente.');
        }
      );
    }
  }, []);

  // Obter endereço a partir de coordenadas
  const obterEnderecoDosCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.address?.road || data.address?.street || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Obter coordenadas a partir de endereço
  const obterCoordenadosDoEndereco = async (endereco) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`
      );
      const data = await response.json();
      if (data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
    } catch {
      console.error('Erro ao geocodificar');
    }
    return null;
  };

  // Calcular quilómetros entre dois pontos (Haversine)
  const calcularDistancia = (coord1, coord2) => {
    if (!coord1 || !coord2) return 0;

    const R = 6371; // Raio da Terra em km
    const lat1 = coord1.latitude * (Math.PI / 180);
    const lat2 = coord2.latitude * (Math.PI / 180);
    const dlat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
    const dlng = (coord2.longitude - coord1.longitude) * (Math.PI / 180);

    const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dlng / 2) * Math.sin(dlng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  // Calcular preço baseado em tempo e conforto
  const calcularPreco = (horaInicio, horaFim, quilometros) => {
    // Preço base: 0.15€ por minuto
    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFim.split(':').map(Number);

    const minutosTotais = (hF * 60 + mF) - (hI * 60 + mI);
    if (minutosTotais <= 0) return 0;

    // Preço = (minutos * 0.15) + (quilómetros * 0.10)
    const precoBase = minutosTotais * 0.15;
    const precoQuilometros = quilometros * 0.10;

    return parseFloat((precoBase + precoQuilometros).toFixed(2));
  };

  // Passo 1: Registar entrada
  const handleRegistarEntrada = async (e) => {
    e.preventDefault();
    setErro('');

    if (!viagem.endereco_inicio || viagem.num_pessoas < 1) {
      setErro('Preenche todos os campos obrigatórios.');
      return;
    }

    // Se não tem coordenadas, tenta geocodificar
    if (!viagem.coordenadas_inicio) {
      setProcessando(true);
      const coords = await obterCoordenadosDoEndereco(viagem.endereco_inicio);
      if (!coords) {
        setErro('Não foi possível geocodificar o endereço. Tenta novamente.');
        setProcessando(false);
        return;
      }
      setViagem(prev => ({ ...prev, coordenadas_inicio: coords }));
      setProcessando(false);
    }

    setSucesso('✅ Entrada registada! Agora registar a saída.');
    setEtapa('saida');
  };

  // Passo 2: Registar saída
  const handleRegistarSaida = async (e) => {
    e.preventDefault();
    setErro('');

    if (!viagem.endereco_fim || !viagem.hora_fim) {
      setErro('Preenche todos os campos obrigatórios.');
      return;
    }

    // Se não tem coordenadas, tenta geocodificar
    let coordsFim = viagem.coordenadas_fim;
    if (!coordsFim) {
      setProcessando(true);
      coordsFim = await obterCoordenadosDoEndereco(viagem.endereco_fim);
      if (!coordsFim) {
        setErro('Não foi possível geocodificar o endereço. Tenta novamente.');
        setProcessando(false);
        return;
      }
      setProcessando(false);
    }

    // Calcular quilómetros
    const quilometros = calcularDistancia(viagem.coordenadas_inicio, coordsFim);

    // Calcular preço
    const preco = calcularPreco(viagem.hora_inicio, viagem.hora_fim, quilometros);

    setViagem(prev => ({
      ...prev,
      coordenadas_fim: coordsFim,
      quilometros,
      preco
    }));

    setSucesso('✅ Saída registada! Revê o resumo.');
    setEtapa('resumo');
  };

  // Passo 3: Pagar viagem
  const handlePagamentoSucesso = (tripData) => {
    setSucesso('✅ Pagamento realizado com sucesso!');
    setTimeout(() => {
      navigate('/motorista/mapa', { replace: true });
    }, 2000);
  };

  const handlePagamentoErro = (errorMessage) => {
    setErro(`❌ Erro no pagamento: ${errorMessage}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Registar Viagem</h1>

        {erro && <div className={styles.erro}>{erro}</div>}
        {sucesso && <div className={styles.sucesso}>{sucesso}</div>}

        {/* ETAPA 1: ENTRADA */}
        {etapa === 'entrada' && (
          <form onSubmit={handleRegistarEntrada} className={styles.form}>
            <h2>📍 Local de Entrada</h2>

            <div className={styles.formGroup}>
              <label>Morada de Entrada *</label>
              <input
                type="text"
                value={viagem.endereco_inicio}
                onChange={(e) => setViagem(prev => ({ ...prev, endereco_inicio: e.target.value }))}
                placeholder="Morada de entrada (ex: Rua da Paz, Lisboa)"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Número de Pessoas *</label>
              <input
                type="number"
                min="1"
                max="4"
                value={viagem.num_pessoas}
                onChange={(e) => setViagem(prev => ({ ...prev, num_pessoas: parseInt(e.target.value) }))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Hora de Entrada</label>
              <input
                type="time"
                value={viagem.hora_inicio}
                onChange={(e) => setViagem(prev => ({ ...prev, hora_inicio: e.target.value }))}
              />
            </div>

            <button type="submit" className={styles.btnPrimario} disabled={processando}>
              {processando ? '⏳ A processar...' : '✅ Entrada Registada'}
            </button>
          </form>
        )}

        {/* ETAPA 2: SAÍDA */}
        {etapa === 'saida' && (
          <form onSubmit={handleRegistarSaida} className={styles.form}>
            <h2>📍 Local de Saída</h2>

            <div className={styles.resumoEntrada}>
              <p><strong>Entrada em:</strong> {viagem.endereco_inicio}</p>
              <p><strong>Pessoas:</strong> {viagem.num_pessoas}</p>
              <p><strong>Hora:</strong> {viagem.hora_inicio}</p>
            </div>

            <div className={styles.formGroup}>
              <label>Morada de Saída *</label>
              <input
                type="text"
                value={viagem.endereco_fim}
                onChange={(e) => setViagem(prev => ({ ...prev, endereco_fim: e.target.value }))}
                placeholder="Morada de saída (ex: Aeroporto de Lisboa)"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Hora de Saída *</label>
              <input
                type="time"
                value={viagem.hora_fim}
                onChange={(e) => setViagem(prev => ({ ...prev, hora_fim: e.target.value }))}
              />
            </div>

            <div className={styles.botoesGrupo}>
              <button
                type="button"
                className={styles.btnSecundario}
                onClick={() => setEtapa('entrada')}
              >
                ← Voltar
              </button>
              <button
                type="submit"
                className={styles.btnPrimario}
                disabled={processando}
              >
                {processando ? '⏳ A processar...' : '✅ Saída Registada'}
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 3: RESUMO */}
        {etapa === 'resumo' && (
          <div className={styles.resumo}>
            <h2>📋 Resumo da Viagem</h2>

            <div className={styles.detalhes}>
              <div className={styles.detalhe}>
                <strong>Origem:</strong>
                <span>{viagem.endereco_inicio}</span>
              </div>
              <div className={styles.detalhe}>
                <strong>Destino:</strong>
                <span>{viagem.endereco_fim}</span>
              </div>
              <div className={styles.detalhe}>
                <strong>Hora de Entrada:</strong>
                <span>{viagem.hora_inicio}</span>
              </div>
              <div className={styles.detalhe}>
                <strong>Hora de Saída:</strong>
                <span>{viagem.hora_fim}</span>
              </div>
              <div className={styles.detalhe}>
                <strong>Quilómetros:</strong>
                <span>{viagem.quilometros} km</span>
              </div>
              <div className={styles.detalhe}>
                <strong>Número de Pessoas:</strong>
                <span>{viagem.num_pessoas}</span>
              </div>
              <div className={styles.detalhePreco}>
                <strong>Preço Total:</strong>
                <span className={styles.preco}>€{viagem.preco.toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.botoesGrupo}>
              <button
                className={styles.btnSecundario}
                onClick={() => setEtapa('saida')}
              >
                ← Corrigir
              </button>
              <button
                className={styles.btnPrimario}
                onClick={() => setEtapa('pagamento')}
              >
                💳 Pagar Agora
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 4: PAGAMENTO */}
        {etapa === 'pagamento' && (
          <div className={styles.pagamento}>
            <h2>💳 Pagamento</h2>
            <p className={styles.montante}>Montante: <strong>€{viagem.preco.toFixed(2)}</strong></p>

            <PaymentForm
              tripId="temp-trip-id"
              amount={viagem.preco}
              onSuccess={handlePagamentoSucesso}
              onError={handlePagamentoErro}
            />

            <button
              className={styles.btnSecundario}
              onClick={() => setEtapa('resumo')}
              style={{ marginTop: '1rem' }}
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
