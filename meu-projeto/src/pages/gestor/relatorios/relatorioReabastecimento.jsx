import React, { useState, useEffect } from 'react';
import { obterRelatorioReabastecimentos } from '../../../services/relatoriosService';
import styles from './relatorioReabastecimento.module.css';

export default function RelatorioReabastecimento() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewLevel, setViewLevel] = useState('total');

  const carregarRelatorio = async () => {
    setLoading(true);
    setError(null);

    try {
      const resultado = await obterRelatorioReabastecimentos(startDate, endDate);

      console.log('Resultado relatório reabastecimentos:', resultado);

      setData(resultado.data);
      setViewLevel('total');
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setError(err.message || 'Erro ao carregar relatório de reabastecimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, []);

  const formatarHoras = (horas) => {
    if (!horas) return '0.00h';
    return `${Number(horas).toFixed(2)}h`;
  };

  const formatarEuros = (valor) => {
    return `€${Number(valor || 0).toFixed(2)}`;
  };

  const nomeTipoMotor = (tipoMotor) => {
    if (!tipoMotor) return 'Tipo de motor desconhecido';

    const tipo = String(tipoMotor).toLowerCase();

    if (
      tipo === 'eletrico' ||
      tipo === 'elétrico' ||
      tipo === 'electric' ||
      tipo === 'ev'
    ) {
      return '⚡ Motor Elétrico';
    }

    if (
      tipo === 'combustao' ||
      tipo === 'combustão' ||
      tipo === 'combustion' ||
      tipo === 'gasolina' ||
      tipo === 'diesel'
    ) {
      return '🔥 Motor a Combustão';
    }

    return `🚕 ${tipoMotor}`;
  };

  const renderTotal = () => {
    if (!data?.summary) {
      return (
        <div className={styles.section}>
          <p>Não existem dados de resumo para este período.</p>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <h2>Resumo Total de Reabastecimentos</h2>

        <div className={styles.totalCard}>
          <div className={styles.metric}>
            <span className={styles.label}>Total de Euros Pagos:</span>
            <span className={styles.value}>
              {formatarEuros(data.summary.total_euros)}
            </span>
          </div>

          <div className={styles.metric}>
            <span className={styles.label}>Total de Horas Gastas:</span>
            <span className={styles.value}>
              {formatarHoras(data.summary.total_hours)}
            </span>
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
    if (!data?.motorTypes || data.motorTypes.length === 0) {
      return (
        <div className={styles.section}>
          <div className={styles.header}>
            <button
              className={styles.backBtn}
              onClick={() => setViewLevel('total')}
            >
              ← Voltar
            </button>

            <h2>Subtotais por Tipo de Motor</h2>
          </div>

          <p>Não existem reabastecimentos por tipo de motor neste período.</p>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel('total')}
          >
            ← Voltar
          </button>

          <h2>Subtotais por Tipo de Motor</h2>
        </div>

        <div className={styles.subtotaisGrid}>
          {data.motorTypes.map((motor) => (
            <div key={motor.tipo_motor} className={styles.subtotalCard}>
              <div className={styles.subtotalHeader}>
                <span>{nomeTipoMotor(motor.tipo_motor)}</span>

                <span className={styles.value}>
                  {formatarEuros(motor.total_euros)}
                </span>
              </div>

              <div className={styles.subtotalDetails}>
                <span>Tipo de motor: {motor.tipo_motor}</span>
                <span>Reabastecimentos: {motor.total_refuels || 0}</span>
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
    </div>
  );
}