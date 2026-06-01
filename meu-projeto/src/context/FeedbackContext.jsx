import { createContext, useContext, useMemo, useState } from "react";
import FeedbackContainer from "../components/FeedbackContainer";

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [feedbacks, setFeedbacks] = useState([]);

  function removeFeedback(id) {
    setFeedbacks((current) => current.filter((feedback) => feedback.id !== id));
  }

  function showFeedback(type, message, options = {}) {
    const id = crypto.randomUUID();

    const feedback = {
      id,
      type,
      message,
      title: options.title || "",
      duration: options.duration ?? 3500,
    };

    setFeedbacks((current) => [feedback, ...current]);

    if (feedback.duration > 0) {
      setTimeout(() => {
        removeFeedback(id);
      }, feedback.duration);
    }

    return id;
  }

  const value = useMemo(
    () => ({
      success: (message, options) => showFeedback("success", message, options),
      error: (message, options) => showFeedback("error", message, options),
      info: (message, options) => showFeedback("info", message, options),
      warning: (message, options) => showFeedback("warning", message, options),
      removeFeedback,
    }),
    []
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackContainer feedbacks={feedbacks} onClose={removeFeedback} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback tem de ser usado dentro de FeedbackProvider");
  }

  return context;
}