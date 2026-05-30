import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motoristaService } from "../../../services/motoristaService";
import styles from "./MotoristaListPage.module.css";

const ESTADO_LABEL = {
  disponivel:   { text: "Disponível",   cls: "active" },
  indisponivel: { text: "Indisponível", cls: "inactive" },
};

export default function MotoristaListPage() {
  const navigate = useNavigate();

  const [motoristas, setMotoristas] = useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    motoristaService.list()
      .then(setMotoristas)
      .catch(() => setError("Não foi possível carregar a lista de motoristas."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = motoristas.filter((m) =>
    [m.nome, m.nif, m.n_carta].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  async function handleDelete(id) {
    if (!window.confirm("Tens a certeza que queres remover este motorista?")) return;
    try {
      await motoristaService.remove(id);
      setMotoristas((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.message ?? "Erro ao remover motorista.");
    }
  }

  // Verifica se a carta está a expirar em menos de 30 dias
  function cartaExpirando(validade) {
    if (!validade) return false;
    const diff = new Date(validade) - new Date();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }

  function cartaExpirada(validade) {
    if (!validade) return false;
    return new Date(validade) < new Date();
  }
  
  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Motoristas</h1>
          <p className={styles.pageSubtitle}>Gerir motoristas registados</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate("/gestor/motoristas/novo")}>
          + Registar motorista
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.tableHeader}>
          <span className={styles.tableCount}>
            {loading ? "A carregar…" : `${filtered.length} motorista${filtered.length !== 1 ? "s" : ""}`}
          </span>
          <input
            placeholder="Pesquisar nome, NIF..."
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
                  <th>Nome</th>
                  <th>NIF</th>
                  <th>N.º carta</th>
                  <th>Validade carta</th>
                  <th>Telefone</th>
                  <th>Estado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {search ? "Nenhum resultado para a pesquisa." : "Nenhum motorista registado ainda."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const estado = ESTADO_LABEL[m.estado] ?? { text: m.estado, cls: "inactive" };
                    const expirando = cartaExpirando(m.validade_carta);
                    const expirada  = cartaExpirada(m.validade_carta);
                    return (
                      <tr key={m.id}>
                        <td className={styles.nome}>{m.nome}</td>
                        <td>{m.nif}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.n_carta}</td>
                        <td>
                          <span className={expirada ? styles.dateExpired : expirando ? styles.dateWarning : ""}>
                            {m.validade_carta}
                          </span>
                          {expirada  && <span className={styles.alertTag}>Expirada</span>}
                          {expirando && <span className={styles.warnTag}>Expira em breve</span>}
                        </td>
                        <td>{m.telefone}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[estado.cls]}`}>
                            {estado.text}
                          </span>
                        </td>
                        <td className={styles.actions}>
                          <div className={styles.actionsInner}>
                            <button
                              className={styles.editBtn}
                              onClick={() => navigate(`/gestor/motoristas/${m.id}/editar`)}
                            >
                              Editar
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(m.id)}
                            >
                              Remover
                            </button>
                          </div>
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