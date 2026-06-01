import React, { useState, useEffect } from 'react';
import { obterRelatorioClientesFaturacao } from '../../../services/relatoriosService';
import styles from './relatoriosClienteFatura.module.css';

export default function RelatoriosClienteFatura() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewLevel, setViewLevel] = useState('total');
  const [expandedCliente, setExpandedCliente] = useState(null);

  const carregarRelatorio = async () => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await obterRelatorioClientesFaturacao(startDate, endDate);
      setData(resultado);
      setViewLevel('total');
      setExpandedCliente(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, []);

  const renderTotal = () => {
    if (!data?.total) return null;
    return (
      <div className={styles.section}>
        <h2>Resumo Total de Faturação</h2>
        <div className={styles.totalCard}>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Euros Cobrados:</span>
            <span className={styles.value}>€{data.total.euros_total?.toFixed(2) || '0.00'}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.label}>Número de Viagens:</span>
            <span className={styles.value}>{data.total.viagens || 0}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.label}>Número de Clientes:</span>
            <span className={styles.value}>{data.total.clientes || 0}</span>
          </div>
        </div>
        <button 
          className={styles.expandBtn}
          onClick={() => setViewLevel('subtotais')}
        >
          Ver Subtotais por Cliente →
        </button>
      </div>
    );
  };

  const renderSubtotais = () => {
    if (!data?.subtotais?.clientes) return null;

    // Ordenar clientes por euros pagos (decrescente)
    const clientesOrdenados = Object.entries(data.subtotais.clientes)
      .sort(([, a], [, b]) => (b.euros || 0) - (a.euros || 0));

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => {
              setViewLevel('total');
              setExpandedCliente(null);
            }}
          >
            ← Voltar
          </button>
          <h2>Euros por Cliente</h2>
        </div>

        <div className={styles.subtotaisGrid}>
          {clientesOrdenados.map(([clienteId, stats]) => (
            <div key={clienteId} className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span>Cliente {clienteId}</span>
                <span className={styles.value}>€{stats.euros?.toFixed(2) || '0.00'}</span>
              </div>
              <div className={styles.subtotalDetails}>
                <span>Viagens: {stats.viagens}</span>
                <span>Ticket Médio: €{((stats.euros || 0) / (stats.viagens || 1)).toFixed(2)}</span>
              </div>
              <button
                className={styles.detalhesBtn}
                onClick={() => {
                  if (expandedCliente === clienteId) {
                    setExpandedCliente(null);
                  } else {
                    setExpandedCliente(clienteId);
                    setViewLevel('detalhes');
                  }
                }}
              >
                {expandedCliente === clienteId ? '▼ Ver Detalhes' : '▶ Ver Detalhes'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetalhes = () => {
    if (!data?.detalhes?.clientes?.[expandedCliente]) return null;

    const clienteData = data.detalhes.clientes[expandedCliente];
    
    // Ordenar viagens por euros pagos (decrescente)
    const viagensOrdenadas = (clienteData.viagens || [])
      .sort((a, b) => (b.price || 0) - (a.price || 0));

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button 
            className={styles.backBtn}
            onClick={() => {
              setViewLevel('subtotais');
              setExpandedCliente(null);
            }}
          >
            ← Voltar
          </button>
          <h2>Viagens do Cliente {expandedCliente}</h2>
        </div>

        <div className={styles.detalhesList}>
          {viagensOrdenadas.map((viagem, idx) => (
            <div key={idx} className={styles.detalheCard}>
              <div className={styles.detalhHeader}>
                <strong>{viagem.start_location} → {viagem.end_location}</strong>
              </div>
              <div className={styles.detalhContent}>
                <span>📅 {new Date(viagem.start_date).toLocaleDateString('pt-PT')}</span>
                <span>💶 €{viagem.price?.toFixed(2)}</span>
                <span>🚗 {viagem.quilometros} km</span>
                {viagem.fatura_numero && (
                  <span>📄 Fatura #{viagem.fatura_numero}</span>
                )}
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
        <h1>Relatórios - Clientes e Faturação</h1>
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
