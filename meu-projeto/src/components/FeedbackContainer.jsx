import styles from "./FeedbackContainer.module.css";

const ICONS = {
  success: "✓",
  error: "!",
  info: "i",
  warning: "!",
};

const TITLES = {
  success: "Sucesso",
  error: "Erro",
  info: "Informação",
  warning: "Atenção",
};

export default function FeedbackContainer({ feedbacks, onClose }) {
  if (!feedbacks.length) return null;

  return (
    <div className={styles.feedbackArea}>
      {feedbacks.map((feedback) => (
        <div
          key={feedback.id}
          className={`${styles.feedback} ${styles[feedback.type]}`}
        >
          <div className={styles.icon}>
            {ICONS[feedback.type] || "i"}
          </div>

          <div className={styles.content}>
            <strong>{feedback.title || TITLES[feedback.type]}</strong>
            <p>{feedback.message}</p>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => onClose(feedback.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}