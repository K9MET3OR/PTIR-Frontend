import { createContext, useContext, useState } from "react";
import styles from "./ConfirmContext.module.css";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);

  function confirm({
    title = "Confirmar ação",
    message = "Tens a certeza que queres continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
  } = {}) {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        resolve,
      });
    });
  }

  function handleCancel() {
    if (confirmState?.resolve) {
      confirmState.resolve(false);
    }

    setConfirmState(null);
  }

  function handleConfirm() {
    if (confirmState?.resolve) {
      confirmState.resolve(true);
    }

    setConfirmState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {confirmState && (
        <div className={styles.overlay} onMouseDown={handleCancel}>
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.iconWrap}>
              <div
                className={`${styles.icon} ${
                  confirmState.variant === "danger"
                    ? styles.iconDanger
                    : styles.iconInfo
                }`}
              >
                {confirmState.variant === "danger" ? "!" : "i"}
              </div>
            </div>

            <div className={styles.content}>
              <h2>{confirmState.title}</h2>
              <p>{confirmState.message}</p>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancel}
              >
                {confirmState.cancelText}
              </button>

              <button
                type="button"
                className={`${styles.confirmBtn} ${
                  confirmState.variant === "danger"
                    ? styles.confirmDanger
                    : styles.confirmInfo
                }`}
                onClick={handleConfirm}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  }

  return context;
}