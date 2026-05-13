import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { taxiService } from "../../../services/taxiService";
import styles from "./TaxiListPage.module.css";

const ESTADO_LABEL = {
  disponivel:   { text: "Disponível", cls: "active" },
  indisponivel: { text: "Indisponível", cls: "inactive" },
  ocupado:      { text: "Ocupado", cls: "busy" },
};

export default function TaxiListPage() {
  const navigate = useNavigate();

  const [taxis,   setTaxis]   = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    taxiService.list()
      .then((response) => setTaxis(Array.isArray(response?.data) ? response.data : []))
      .catch(() => setError("Não foi possível carregar a lista de táxis."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = taxis.filter((t) =>
    [t.matricula, t.marca, t.modelo].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  async function handleDelete(id) {
    if (!window.confirm("Tens a certeza que queres remover este táxi?")) return;
    try {
      await taxiService.remove(id);
      setTaxis((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message ?? "Erro ao remover táxi.");
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Táxis</h1>
          <p className={styles.pageSubtitle}>Gerir veículos registados</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate("/gestor/taxis/novo")}>
          + Registar táxi
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.tableHeader}>
          <span className={styles.tableCount}>
            {loading ? "A carregar…" : `${filtered.length} táxi${filtered.length !== 1 ? "s" : ""}`}
          </span>
          <input
            placeholder="Pesquisar matrícula, marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {!loading && !error && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Ano</th>
                  <th>Consumo médio</th>
                  <th>Motor</th>
                  <th>Conforto</th>
                  <th>Estado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.empty}>
                      {search ? "Nenhum resultado para a pesquisa." : "Nenhum táxi registado ainda."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((taxi) => {
                    const estadoKey = String(taxi.estado || "").trim().toLowerCase();
                    const estado = ESTADO_LABEL[estadoKey] ?? { text: taxi.estado || "Desconhecido", cls: "inactive" };
                    return (
                      <tr key={taxi.id}>
                        <td className={styles.matricula}>{taxi.matricula}</td>
                        <td>{taxi.marca}</td>
                        <td>{taxi.modelo}</td>
                        <td>{taxi.ano_compra}</td>
                        <td>{taxi.consumo_medio} L/100km</td>
                        <td>{taxi.tipo_motor}</td>
                        <td>{taxi.nivel_conforto}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[estado.cls]}`}>
                            {estado.text}
                          </span>
                        </td>
                        <td className={styles.actions}>
                          <button
                            className={styles.editBtn}
                            onClick={() => navigate(`/gestor/taxis/${taxi.id}/editar`)}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(taxi.id)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}