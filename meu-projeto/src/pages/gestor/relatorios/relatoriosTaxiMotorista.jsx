import React, { useState, useEffect } from 'react';
import {
  obterRelatorioTaxisMotoristas,
  obterDetalhesViagensMotorista,
  obterDetalhesViagensTaxi,
  obterDetalheViagem,
  obterDetalheMotorista,
  obterDetalheTaxi
} from '../../../services/relatoriosService';
import styles from './relatoriosTaxiMotorista.module.css';

export default function RelatoriosTaxiMotorista() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewLevel, setViewLevel] = useState('total');
  const [tipoSubtotais, setTipoSubtotais] = useState('trips');

  const [detalhesTipo, setDetalhesTipo] = useState(null);
  const [detalhesId, setDetalhesId] = useState(null);
  const [detalhesViagens, setDetalhesViagens] = useState([]);

  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedDetailType, setSelectedDetailType] = useState(null);

  const carregarRelatorio = async () => {
    setLoading(true);
    setError(null);

    try {
      const resultado = await obterRelatorioTaxisMotoristas(startDate, endDate);

      setData(resultado.data);
      setViewLevel('total');
      setTipoSubtotais('trips');
      setDetalhesTipo(null);
      setDetalhesId(null);
      setDetalhesViagens([]);
      setSelectedDetail(null);
      setSelectedDetailType(null);
    } catch (err) {
      setError(err.message || 'Erro ao carregar relatório de táxis e motoristas');
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

  const formatarKm = (kms) => {
    return `${Number(kms || 0).toFixed(2)} km`;
  };

  const formatarEuros = (valor) => {
    return `€${Number(valor || 0).toFixed(2)}`;
  };

  const formatarDataHora = (valor) => {
    if (!valor) return '-';
    return new Date(valor).toLocaleString('pt-PT');
  };

  const getValor = (item) => {
    if (tipoSubtotais === 'hours') return formatarHoras(item.total_hours);
    if (tipoSubtotais === 'kms') return formatarKm(item.total_kms);
    return `${item.total_trips || 0} viagens`;
  };

  const getTituloSubtotais = () => {
    if (tipoSubtotais === 'hours') return 'Horas';
    if (tipoSubtotais === 'kms') return 'Quilómetros';
    return 'Viagens';
  };

  const getTituloDetalhes = () => {
    const entidade = detalhesTipo === 'driver'
      ? `Motorista ${detalhesId}`
      : `Táxi ${detalhesId}`;

    if (tipoSubtotais === 'hours') {
      return `Viagens de ${entidade} por horas, da maior duração para a menor`;
    }

    if (tipoSubtotais === 'kms') {
      return `Viagens de ${entidade} por quilómetros, do maior para o menor`;
    }

    return `Viagens de ${entidade}, da mais recente para a mais antiga`;
  };

  const abrirSubtotais = (metric) => {
    setTipoSubtotais(metric);
    setViewLevel('subtotais');
  };

  const carregarDetalhesMotorista = async (driverId) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const resultado = await obterDetalhesViagensMotorista(
        driverId,
        tipoSubtotais,
        startDate,
        endDate
      );

      setDetalhesTipo('driver');
      setDetalhesId(driverId);
      setDetalhesViagens(resultado.trips || []);
      setViewLevel('detalhes');
    } catch (err) {
      setError(err.message || 'Erro ao carregar detalhes do motorista');
    } finally {
      setDetailsLoading(false);
    }
  };

  const carregarDetalhesTaxi = async (taxiId) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const resultado = await obterDetalhesViagensTaxi(
        taxiId,
        tipoSubtotais,
        startDate,
        endDate
      );

      setDetalhesTipo('taxi');
      setDetalhesId(taxiId);
      setDetalhesViagens(resultado.trips || []);
      setViewLevel('detalhes');
    } catch (err) {
      setError(err.message || 'Erro ao carregar detalhes do táxi');
    } finally {
      setDetailsLoading(false);
    }
  };

  const carregarDetalheObjeto = async (type, id) => {
    setDetailsLoading(true);
    setError(null);

    try {
      let resultado;

      if (type === 'trip') {
        resultado = await obterDetalheViagem(id);
        setSelectedDetail(resultado.trip);
      }

      if (type === 'driver') {
        resultado = await obterDetalheMotorista(id);
        setSelectedDetail(resultado.driver);
      }

      if (type === 'taxi') {
        resultado = await obterDetalheTaxi(id);
        setSelectedDetail(resultado.taxi);
      }

      setSelectedDetailType(type);
      setViewLevel('detalheObjeto');
    } catch (err) {
      setError(err.message || 'Erro ao carregar detalhes');
    } finally {
      setDetailsLoading(false);
    }
  };

  const renderTotal = () => {
    if (!data?.summary) {
      return (
        <div className={styles.section}>
          <p>Não existem dados para este período.</p>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <h2>Resumo Total</h2>

        <div className={styles.totalCard}>
          <div
            className={styles.metric}
            onClick={() => abrirSubtotais('trips')}
            style={{ cursor: 'pointer' }}
          >
            <span className={styles.label}>Total de Viagens:</span>
            <span className={styles.value}>{data.summary.total_trips || 0}</span>
          </div>

          <div
            className={styles.metric}
            onClick={() => abrirSubtotais('hours')}
            style={{ cursor: 'pointer' }}
          >
            <span className={styles.label}>Total de Horas:</span>
            <span className={styles.value}>{formatarHoras(data.summary.total_hours)}</span>
          </div>

          <div
            className={styles.metric}
            onClick={() => abrirSubtotais('kms')}
            style={{ cursor: 'pointer' }}
          >
            <span className={styles.label}>Total de Quilómetros:</span>
            <span className={styles.value}>{formatarKm(data.summary.total_kms)}</span>
          </div>
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => abrirSubtotais('trips')}
        >
          Ver Subtotais →
        </button>
      </div>
    );
  };

  const renderSubtotais = () => {
    if (!data) return null;

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel('total')}
          >
            ← Voltar
          </button>

          <h2>Subtotais - {getTituloSubtotais()}</h2>
        </div>

        <div className={styles.subtotaisGrid}>
          <div>
            <h3>Por Motorista</h3>

            {!data.drivers || data.drivers.length === 0 ? (
              <p>Não existem motoristas com viagens neste período.</p>
            ) : (
              data.drivers.map((driver) => (
                <div key={driver.driver_id} className={styles.subtotalCard}>
                  <div className={styles.subtotalHeader}>
                    <span
                      onClick={() => carregarDetalheObjeto('driver', driver.driver_id)}
                      style={{ cursor: 'pointer' }}
                      title="Ver detalhes do motorista"
                    >
                      Motorista {driver.driver_id}
                    </span>

                    <span className={styles.value}>{getValor(driver)}</span>
                  </div>

                  <div className={styles.subtotalDetails}>
                    <span>Viagens: {driver.total_trips || 0}</span>
                    <span>Horas: {formatarHoras(driver.total_hours)}</span>
                    <span>Quilómetros: {formatarKm(driver.total_kms)}</span>
                  </div>

                  <button
                    className={styles.detalhesBtn}
                    onClick={() => carregarDetalhesMotorista(driver.driver_id)}
                    disabled={detailsLoading}
                  >
                    Ver viagens deste motorista →
                  </button>
                </div>
              ))
            )}
          </div>

          <div>
            <h3>Por Táxi</h3>

            {!data.taxis || data.taxis.length === 0 ? (
              <p>Não existem táxis com viagens neste período.</p>
            ) : (
              data.taxis.map((taxi) => (
                <div key={taxi.taxi_id} className={styles.subtotalCard}>
                  <div className={styles.subtotalHeader}>
                    <span
                      onClick={() => carregarDetalheObjeto('taxi', taxi.taxi_id)}
                      style={{ cursor: 'pointer' }}
                      title="Ver detalhes do táxi"
                    >
                      Táxi {taxi.taxi_id}
                    </span>

                    <span className={styles.value}>{getValor(taxi)}</span>
                  </div>

                  <div className={styles.subtotalDetails}>
                    <span>Viagens: {taxi.total_trips || 0}</span>
                    <span>Horas: {formatarHoras(taxi.total_hours)}</span>
                    <span>Quilómetros: {formatarKm(taxi.total_kms)}</span>
                  </div>

                  <button
                    className={styles.detalhesBtn}
                    onClick={() => carregarDetalhesTaxi(taxi.taxi_id)}
                    disabled={detailsLoading}
                  >
                    Ver viagens deste táxi →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDetalhes = () => {
    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel('subtotais')}
          >
            ← Voltar
          </button>

          <h2>{getTituloDetalhes()}</h2>
        </div>

        {detailsLoading && <div className={styles.loading}>Carregando detalhes...</div>}

        {!detailsLoading && detalhesViagens.length === 0 && (
          <p>Não existem viagens para este subtotal.</p>
        )}

        {!detailsLoading && detalhesViagens.length > 0 && (
          <div className={styles.detalhesList}>
            {detalhesViagens.map((viagem) => (
              <div key={viagem.id} className={styles.detalheCard}>
                <div className={styles.detalhHeader}>
                  <strong
                    onClick={() => carregarDetalheObjeto('trip', viagem.id)}
                    style={{ cursor: 'pointer' }}
                    title="Ver detalhes da viagem"
                  >
                    Viagem #{viagem.id}
                  </strong>
                </div>

                <div className={styles.detalhContent}>
                  <span>Início: {formatarDataHora(viagem.start_date)}</span>
                  <span>Fim: {formatarDataHora(viagem.end_date)}</span>
                  <span>Duração: {formatarHoras(viagem.duration_hours)}</span>
                  <span>Quilómetros: {formatarKm(viagem.n_kms)}</span>
                  <span>Preço: {formatarEuros(viagem.price)}</span>

                  {viagem.driver_id && (
                    <span
                      onClick={() => carregarDetalheObjeto('driver', viagem.driver_id)}
                      style={{ cursor: 'pointer' }}
                      title="Ver detalhes do motorista"
                    >
                      Motorista: {viagem.driver_id}
                    </span>
                  )}

                  {viagem.taxi_id && (
                    <span
                      onClick={() => carregarDetalheObjeto('taxi', viagem.taxi_id)}
                      style={{ cursor: 'pointer' }}
                      title="Ver detalhes do táxi"
                    >
                      Táxi: {viagem.taxi_id}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetalheObjeto = () => {
    if (!selectedDetail) {
      return (
        <div className={styles.section}>
          <p>Não foi possível carregar os detalhes.</p>
        </div>
      );
    }

    const titulo =
      selectedDetailType === 'trip'
        ? `Detalhes da Viagem #${selectedDetail.id}`
        : selectedDetailType === 'driver'
          ? `Detalhes do Motorista ${selectedDetail.id}`
          : `Detalhes do Táxi ${selectedDetail.id}`;

    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setViewLevel(detalhesViagens.length > 0 ? 'detalhes' : 'subtotais')}
          >
            ← Voltar
          </button>

          <h2>{titulo}</h2>
        </div>

        <div className={styles.detalhesList}>
          {Object.entries(selectedDetail).map(([key, value]) => (
            <div key={key} className={styles.detalheCard}>
              <div className={styles.detalhContent}>
                <span>
                  <strong>{key}:</strong>{' '}
                  {value === null || value === undefined || value === ''
                    ? '-'
                    : String(value)}
                </span>
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

      {!loading && data && viewLevel === 'total' && renderTotal()}

      {!loading && data && viewLevel === 'subtotais' && renderSubtotais()}

      {!loading && data && viewLevel === 'detalhes' && renderDetalhes()}

      {!loading && data && viewLevel === 'detalheObjeto' && renderDetalheObjeto()}
    </div>
  );
}