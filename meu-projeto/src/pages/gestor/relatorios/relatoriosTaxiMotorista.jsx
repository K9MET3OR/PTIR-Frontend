import React, { useState, useEffect } from 'react';
import { obterRelatorioTaxisMotoristas } from '../../../services/relatoriosService';
import styles from './relatoriosTaxiMotorista.module.css';

export default function RelatoriosTaxiMotorista() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedMotorista, setExpandedMotorista] = useState(null);
  const [expandedTaxi, setExpandedTaxi] = useState(null);

  // Níveis de visualização: 'total', 'subtotais', 'detalhes'
  const [viewLevel, setViewLevel] = useState('total');

  const carregarRelatorio = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await obterRelatorioTaxisMotoristas(startDate, endDate);
      setData(resultado);
      setViewLevel('total');
      setExpandedLevel(null);
      setExpandedMotorista(null);
      setExpandedTaxi(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, []);

  const formatarHoras = (minutos) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  const renderTotal = () => {
    if (!data?.total) return null;
    return (
      <div className={styles.section}>
        <h2>Resumo Total</h2>
        <div className={styles.totalCard}>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Viagens:</span>
            <span className={styles.value}>{data.total.viagens}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Horas:</span>
            <span className={styles.value}>{formatarHoras(data.total.minutos_total)}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Quilómetros:</span>
            <span className={styles.value}>{data.total.quilometros_total} km</span>
          </div>
        </div>
        <button 
          className={styles.expandBtn}
          onClick={() => {
            setViewLevel('subtotais');
            setExpandedLevel('viagens');
          }}
        >
          Ver Subtotais →
        </button>
      </div>
    );
  };

  const renderSubtotais = () => {
    if (!data?.subtotais) return null;

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => {
              setViewLevel('total');
              setExpandedLevel(null);
            }}
          >
            ← Voltar
          </button>
          <h2>Subtotais - {expandedLevel === 'viagens' ? 'Viagens' : expandedLevel === 'horas' ? 'Horas' : 'Quilómetros'}</h2>
        </div>

        {expandedLevel === 'viagens' && (
          <div className={styles.subtoaisGrid}>
            <h3>Viagens por Motorista e Táxi</h3>
            {data.subtotais.motoristas && Object.entries(data.subtotais.motoristas).map(([motoristaNome, stats]) => (
              <div key={motoristaNome} className={styles.subtotalCard}>
                <div className={styles.subtotalHeader}>
                  <span>{motoristaNome}</span>
                  <span className={styles.value}>{stats.viagens} viagens</span>
                </div>
                <button
                  className={styles.detalhesBtn}
                  onClick={() => {
                    if (expandedMotorista === motoristaNome) {
                      setExpandedMotorista(null);
                    } else {
                      setExpandedMotorista(motoristaNome);
                      setViewLevel('detalhes');
                    }
                  }}
                >
                  {expandedMotorista === motoristaNome ? '▼ Ver Detalhes' : '▶ Ver Detalhes'}
                </button>
              </div>
            ))}

            {data.subtotais.taxis && (
              <div>
                <h3>Viagens por Táxi</h3>
                {Object.entries(data.subtotais.taxis).map(([taxiId, stats]) => (
                  <div key={taxiId} className={styles.subtotalCard}>
                    <div className={styles.subtotalHeader}>
                      <span>Táxi {taxiId}</span>
                      <span className={styles.value}>{stats.viagens} viagens</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDetalhes = () => {
    if (!data?.detalhes) return null;

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => {
              setViewLevel('subtotais');
              setExpandedMotorista(null);
            }}
          >
            ← Voltar
          </button>
          <h2>Detalhes das Viagens - {expandedMotorista}</h2>
        </div>

        <div className={styles.detalhesList}>
          {data.detalhes[expandedMotorista]?.viagens?.map((viagem, idx) => (
            <div key={idx} className={styles.detalheCard}>
              <div className={styles.detalhHeader}>
                <strong>{viagem.start_location} → {viagem.end_location}</strong>
              </div>
              <div className={styles.detalhContent}>
                <span>📅 {new Date(viagem.start_date).toLocaleDateString('pt-PT')}</span>
                <span>⏱️ {formatarHoras(viagem.duracao_minutos)}</span>
                <span>🚗 {viagem.quilometros} km</span>
                <span>💶 €{viagem.price?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header_section}>
        <h1>Relatórios - Táxis e Motoristas</h1>
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>Data de Início:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Data de Fim:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            className={styles.loadBtn}
            onClick={carregarRelatorio}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Carregar Relatório'}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Carregando dados...</div>}

      {data && !loading && viewLevel === 'total' && renderTotal()}
      {data && !loading && viewLevel === 'subtotais' && renderSubtotais()}
      {data && !loading && viewLevel === 'detalhes' && renderDetalhes()}
    </div>
  );
}
