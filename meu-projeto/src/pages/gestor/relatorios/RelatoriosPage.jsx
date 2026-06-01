import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RelatoriosTaxiMotorista from './relatoriosTaxiMotorista.jsx';
import RelatoriosClienteFatura from './relatoriosClienteFatura.jsx';
import RelatorioReabastecimento from './relatorioReabastecimento.jsx';
import styles from './RelatoriosPage.module.css';

export default function RelatoriosPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('taxis-motoristas');

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.tabsHeader}>
          <h1>Relatórios</h1>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'taxis-motoristas' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('taxis-motoristas')}
            >
              🚕 Táxis e Motoristas
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'clientes-fatura' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('clientes-fatura')}
            >
              💰 Clientes e Faturação
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'reabastecimentos' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('reabastecimentos')}
            >
              ⛽ Reabastecimentos
            </button>
          </div>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'taxis-motoristas' && <RelatoriosTaxiMotorista />}
          {activeTab === 'clientes-fatura' && <RelatoriosClienteFatura />}
          {activeTab === 'reabastecimentos' && <RelatorioReabastecimento />}
        </div>
      </div>
    </div>
  );
}
