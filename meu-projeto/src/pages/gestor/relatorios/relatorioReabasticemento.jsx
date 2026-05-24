import React, { useState, useEffect } from 'react';
import { obterRelatorioReabastecimentos } from '../../../services/relatoriosService';
import styles from './relatorioReabasticemento.module.css';

export default function RelatorioReabastecimento() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewLevel, setViewLevel] = useState('total');
  const [expandedTipo, setExpandedTipo] = useState(null);
  const [expandedTaxi, setExpandedTaxi] = useState(null);

  const carregarRelatorio = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await obterRelatorioReabastecimentos(startDate, endDate);
      setData(resultado);
      setViewLevel('total');
      setExpandedTipo(null);
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
    if (!minutos) return '0h 0m';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  const renderTotal = () => {
    if (!data?.total) return null;
    return (
      <div className={styles.section}>
        <h2>Resumo Total de Reabastecimentos</h2>
        <div className={styles.totalCard}>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Euros Pagos:</span>
            <span className={styles.value}>€{data.total.euros_total?.toFixed(2) || '0.00'}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Horas Gastas:</span>
            <span className={styles.value}>{formatarHoras(data.total.minutos_total)}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.label}>Número de Reabastecimentos:</span>
            <span className={styles.value}>{data.total.reabastecimentos || 0}</span>
          </div>
        </div>
        <button 
          className={styles.expandBtn}
          onClick={() => setViewLevel('subtotais')}
        >
          Ver Subtotais por Tipo de Motor →
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
              setExpandedTipo(null);
            }}
          >
            ← Voltar
          </button>
          <h2>Subtotais por Tipo de Motor</h2>
        </div>

        <div className={styles.subtotaisGrid}>
          {data.subtotais.combustao && (
            <div className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span>🔥 Motor a Combustão</span>
                <span className={styles.value}>€{data.subtotais.combustao.euros?.toFixed(2) || '0.00'}</span>
              </div>
              <div className={styles.subtotalDetails}>
                <span>Reabastecimentos: {data.subtotais.combustao.reabastecimentos}</span>
                <span>Horas Gastas: {formatarHoras(data.subtotais.combustao.minutos)}</span>
                <span>Litros: {data.subtotais.combustao.litros?.toFixed(2)}</span>
              </div>
              <button
                className={styles.detalhesBtn}
                onClick={() => {
                  if (expandedTipo === 'combustao') {
                    setExpandedTipo(null);
                  } else {
                    setExpandedTipo('combustao');
                    setViewLevel('detalhes');
                  }
                }}
              >
                {expandedTipo === 'combustao' ? '▼ Ver Detalhes' : '▶ Ver Detalhes'}
              </button>
            </div>
          )}

          {data.subtotais.eletrico && (
            <div className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span>⚡ Motor Elétrico</span>
                <span className={styles.value}>€{data.subtotais.eletrico.euros?.toFixed(2) || '0.00'}</span>
              </div>
              <div className={styles.subtotalDetails}>
                <span>Reabastecimentos: {data.subtotais.eletrico.reabastecimentos}</span>
                <span>Horas Gastas: {formatarHoras(data.subtotais.eletrico.minutos)}</span>
                <span>kWh: {data.subtotais.eletrico.kwh?.toFixed(2)}</span>
              </div>
              <button
                className={styles.detalhesBtn}
                onClick={() => {
                  if (expandedTipo === 'eletrico') {
                    setExpandedTipo(null);
                  } else {
                    setExpandedTipo('eletrico');
                    setViewLevel('detalhes');
                  }
                }}
              >
                {expandedTipo === 'eletrico' ? '▼ Ver Detalhes' : '▶ Ver Detalhes'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDetalhes = () => {
    if (!data?.detalhes) return null;

    const tipoData = expandedTipo === 'combustao' 
      ? data.detalhes.combustao 
      : data.detalhes.eletrico;

    if (!tipoData) return null;

    // Ordenar táxis por euros pagos (decrescente)
    const taxisOrdenados = Object.entries(tipoData)
      .sort(([, a], [, b]) => (b.euros || 0) - (a.euros || 0));

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => {
              setViewLevel('subtotais');
              setExpandedTipo(null);
              setExpandedTaxi(null);
            }}
          >
            ← Voltar
          </button>
          <h2>
            Detalhes - Táxis com Motor {expandedTipo === 'combustao' ? 'a Combustão' : 'Elétrico'}
          </h2>
        </div>

        <div className={styles.subtotaisGrid}>
          {taxisOrdenados.map(([taxiId, stats]) => (
            <div key={taxiId} className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span>Táxi {taxiId}</span>
                <span className={styles.value}>€{stats.euros?.toFixed(2) || '0.00'}</span>
              </div>
              <div className={styles.subtotalDetails}>
                <span>Reabastecimentos: {stats.reabastecimentos}</span>
                <span>Horas: {formatarHoras(stats.minutos)}</span>
                {expandedTipo === 'combustao' && <span>Litros: {stats.litros?.toFixed(2)}</span>}
                {expandedTipo === 'eletrico' && <span>kWh: {stats.kwh?.toFixed(2)}</span>}
              </div>
              <button
                className={styles.detalhesBtn}
                onClick={() => {
                  if (expandedTaxi === taxiId) {
                    setExpandedTaxi(null);
                    setViewLevel('detalhes');
                  } else {
                    setExpandedTaxi(taxiId);
                    setViewLevel('detalhesTaxi');
                  }
                }}
              >
                {expandedTaxi === taxiId ? '▼ Ver Reabastecimentos' : '▶ Ver Reabastecimentos'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetalhesTaxi = () => {
    if (!data?.detalhesTaxi) return null;

    const reabastecimentos = data.detalhesTaxi[expandedTaxi] || [];

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => {
              setViewLevel('detalhes');
              setExpandedTaxi(null);
            }}
          >
            ← Voltar
          </button>
          <h2>Reabastecimentos do Táxi {expandedTaxi}</h2>
        </div>

        <div className={styles.detalhesList}>
          {reabastecimentos.map((reab, idx) => (
            <div key={idx} className={styles.detalheCard}>
              <div className={styles.detalhHeader}>
                <strong>{new Date(reab.start_date).toLocaleDateString('pt-PT')} - {new Date(reab.start_date).toLocaleTimeString('pt-PT')}</strong>
              </div>
              <div className={styles.detalhContent}>
                <span>⏱️ {formatarHoras(reab.duracao_minutos)}</span>
                <span>💶 €{reab.euros?.toFixed(2)}</span>
                {reab.litros !== undefined && <span>⛽ {reab.litros?.toFixed(2)} L</span>}
                {reab.kwh !== undefined && <span>🔋 {reab.kwh?.toFixed(2)} kWh</span>}
                <span>🚗 {reab.km_taxi} km no táxi</span>
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
        <h1>Relatórios - Reabastecimentos</h1>
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
      {data && !loading && viewLevel === 'detalhesTaxi' && renderDetalhesTaxi()}
    </div>
  );
}
