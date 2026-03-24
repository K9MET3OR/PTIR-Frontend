import { useState } from "react";
import MapaBase from "../../components/MapaBase";
import { TAXIS_MOCK, PEDIDOS_MOCK, COR_ESTADO } from "../../services/mockData";
import styles from "./MapaPedidosPage.module.css";

export default function MapaPedidosPage() {
  const [taxiSelecionado, setTaxiSelecionado] = useState(null);
  const [pedidoAtivo,     setPedidoAtivo]     = useState(null);
  const [filtro,          setFiltro]          = useState("todos");

  // Converte táxis em markers para o mapa
  const taxisFiltrados = TAXIS_MOCK.filter((t) =>
    filtro === "todos" ? true : t.estado === filtro
  );

  const markers = taxisFiltrados.map((t) => ({
    ...t,
    label: t.matricula,
    color: COR_ESTADO[t.estado] ?? COR_ESTADO.offline,
  }));

  function handleMarkerClick(marker) {
    setTaxiSelecionado(marker);
  }

  return (
    <div className={styles.root}>
      {/* Painel lateral */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>Mapa da frota</h2>
          <p className={styles.subtitle}>Lisboa</p>
        </div>

        {/* Filtro */}
        <div className={styles.filtros}>
          {[
            { key: "todos",      label: "Todos" },
            { key: "disponivel", label: "Disponíveis" },
            { key: "em_viagem",  label: "Em viagem" },
          ].map((f) => (
            <button
              key={f.key}
              className={`${styles.filtroBtn} ${filtro === f.key ? styles.filtroAtivo : ""}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Legenda */}
        <div className={styles.legenda}>
          <div className={styles.legendaItem}>
            <div className={styles.legendaDot} style={{ background: "#16a34a" }} />
            <span>Disponível</span>
          </div>
          <div className={styles.legendaItem}>
            <div className={styles.legendaDot} style={{ background: "#dc2626" }} />
            <span>Em viagem</span>
          </div>
          <div className={styles.legendaItem}>
            <div className={styles.legendaDot} style={{ background: "#94a3b8" }} />
            <span>Offline</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Lista de táxis */}
        <div className={styles.listTitle}>
          Táxis ({taxisFiltrados.length})
        </div>
        <div className={styles.lista}>
          {taxisFiltrados.map((t) => (
            <div
              key={t.id}
              className={`${styles.taxiItem} ${taxiSelecionado?.id === t.id ? styles.taxiItemAtivo : ""}`}
              onClick={() => setTaxiSelecionado(t)}
            >
              <div className={styles.taxiDot} style={{ background: COR_ESTADO[t.estado] }} />
              <div className={styles.taxiInfo}>
                <span className={styles.taxiMatricula}>{t.matricula}</span>
                <span className={styles.taxiMotorista}>{t.motorista}</span>
              </div>
              <span className={styles.taxiConforto}>{t.nivel_conforto}</span>
            </div>
          ))}
        </div>

        {/* Pedidos pendentes */}
        {PEDIDOS_MOCK.length > 0 && (
          <>
            <div className={styles.divider} />
            <div className={styles.listTitle}>
              Pedidos pendentes ({PEDIDOS_MOCK.length})
            </div>
            <div className={styles.lista}>
              {PEDIDOS_MOCK.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.pedidoItem} ${pedidoAtivo?.id === p.id ? styles.pedidoAtivo : ""}`}
                  onClick={() => setPedidoAtivo(pedidoAtivo?.id === p.id ? null : p)}
                >
                  <div className={styles.pedidoCliente}>{p.cliente}</div>
                  <div className={styles.pedidoRota}>
                    <span>{p.origem.label.split(",")[0]}</span>
                    <span className={styles.rotaArrow}>→</span>
                    <span>{p.destino.label.split(",")[0]}</span>
                  </div>
                  <div className={styles.pedidoMeta}>
                    {p.n_pessoas} pessoa{p.n_pessoas > 1 ? "s" : ""} · {p.nivel_conforto}
                  </div>
                  {pedidoAtivo?.id === p.id && (
                    <div className={styles.pedidoActions}>
                      <button className={styles.btnAceitar}>Aceitar</button>
                      <button className={styles.btnRejeitar}>Rejeitar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Mapa */}
      <div className={styles.mapaWrap}>
        <MapaBase
          markers={markers}
          height="100%"
          onMarkerClick={handleMarkerClick}
        />

        {/* Popup do táxi selecionado */}
        {taxiSelecionado && (
          <div className={styles.popup}>
            <button className={styles.popupClose} onClick={() => setTaxiSelecionado(null)}>×</button>
            <div className={styles.popupMatricula}>{taxiSelecionado.matricula}</div>
            <div className={styles.popupRow}>
              <span className={styles.popupLabel}>Motorista</span>
              <span>{taxiSelecionado.motorista}</span>
            </div>
            <div className={styles.popupRow}>
              <span className={styles.popupLabel}>Estado</span>
              <span
                className={styles.popupEstado}
                style={{ color: COR_ESTADO[taxiSelecionado.estado] }}
              >
                {taxiSelecionado.estado.replace("_", " ")}
              </span>
            </div>
            <div className={styles.popupRow}>
              <span className={styles.popupLabel}>Conforto</span>
              <span>{taxiSelecionado.nivel_conforto}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}