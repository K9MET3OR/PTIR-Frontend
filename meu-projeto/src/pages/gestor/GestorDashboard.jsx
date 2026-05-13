import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { taxiService } from "../../services/taxiService";
import { motoristaService } from "../../services/motoristaService";
import styles from "./GestorDashboard.module.css";

export default function GestorDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalTaxis:       0,
    taxisAtivos:      0,
    taxisPendentes:   0,
    totalMotoristas:  0,
    motoristasAtivos: 0,
    motoristasPendentes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [taxisResponse, motoristasResponse] = await Promise.all([
          taxiService.list(),
          motoristaService.list(),
        ]);

        const taxis = Array.isArray(taxisResponse?.data)
          ? taxisResponse.data
          : Array.isArray(taxisResponse)
          ? taxisResponse
          : [];

        const motoristas = Array.isArray(motoristasResponse?.motoristas)
          ? motoristasResponse.motoristas
          : Array.isArray(motoristasResponse)
          ? motoristasResponse
          : [];

        setStats({
          totalTaxis:          taxis.length,
          taxisAtivos:         taxis.filter((t) => t.estado === "disponivel").length,
          taxisPendentes:      taxis.filter((t) => t.estado === "indisponivel").length,
          totalMotoristas:     motoristas.length,
          motoristasAtivos:    motoristas.filter((m) => m.estado === "disponivel").length,
          motoristasPendentes: motoristas.filter((m) => m.estado === "indisponivel").length,
        });
      } catch {
        // Se a API ainda não está pronta, mantém zeros
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Visão geral</h1>
        <p className={styles.pageSubtitle}>Resumo da frota e motoristas</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Táxis registados</div>
          <div className={styles.statVal}>{loading ? "—" : stats.totalTaxis}</div>
          <div className={styles.statSub}>{stats.taxisAtivos} ativos</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Motoristas</div>
          <div className={styles.statVal}>{loading ? "—" : stats.totalMotoristas}</div>
          <div className={styles.statSub}>{stats.motoristasAtivos} ativos</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Táxis indisponíveis</div>
          <div className={`${styles.statVal} ${stats.taxisPendentes > 0 ? styles.warn : ""}`}>
            {loading ? "—" : stats.taxisPendentes}
          </div>
          <div className={styles.statSub}>fora de serviço</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Motoristas indisponíveis</div>
          <div className={`${styles.statVal} ${stats.motoristasPendentes > 0 ? styles.warn : ""}`}>
            {loading ? "—" : stats.motoristasPendentes}
          </div>
          <div className={styles.statSub}>não disponíveis</div>
        </div>
      </div>

      {/* Action cards */}
      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Táxis</span>
            <span className={styles.cardIcon}>🚕</span>
          </div>
          <button className={styles.actionItem} onClick={() => navigate("/gestor/taxis/novo")}>
            <div>
              <div className={styles.actionLabel}>Registar táxi</div>
              <div className={styles.actionDesc}>Adicionar novo veículo</div>
            </div>
            <span className={styles.arrow}>→</span>
          </button>
          <button className={styles.actionItem} onClick={() => navigate("/gestor/taxis")}>
            <div>
              <div className={styles.actionLabel}>Gerir táxis</div>
              <div className={styles.actionDesc}>Ver e editar lista</div>
            </div>
            <span className={styles.arrow}>→</span>
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Motoristas</span>
            <span className={styles.cardIcon}>👤</span>
          </div>
          <button className={styles.actionItem} onClick={() => navigate("/gestor/motoristas/novo")}>
            <div>
              <div className={styles.actionLabel}>Registar motorista</div>
              <div className={styles.actionDesc}>Adicionar novo motorista</div>
            </div>
            <span className={styles.arrow}>→</span>
          </button>
          <button className={styles.actionItem} onClick={() => navigate("/gestor/motoristas")}>
            <div>
              <div className={styles.actionLabel}>Gerir motoristas</div>
              <div className={styles.actionDesc}>Ver e editar lista</div>
            </div>
            <span className={styles.arrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}