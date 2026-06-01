import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import styles from "./PaymentForm.module.css";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY?.trim();

const stripePromise = stripeKey
  ? loadStripe(stripeKey).catch((err) => {
      console.error("[STRIPE] Erro ao carregar Stripe:", err);
      return null;
    })
  : Promise.resolve(null);

export default function PaymentForm({ tripId, amount, onSuccess, onError }) {
  if (!stripeKey) {
    return (
      <div className={styles.error}>
        Erro: Stripe publishable key não configurada. Verifique .env.local
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        tripId={tripId}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

function CheckoutForm({ tripId, amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("❌ Stripe não está carregado. Tenta novamente.");
      console.error("[PAYMENT] Stripe ou elements não disponível:", {
        stripe,
        elements,
      });
      return;
    }

    if (!tripId) {
      setMessage("❌ Viagem não encontrada.");
      if (onError) onError("Viagem não encontrada.");
      return;
    }

    const valorPagamento = Number(amount);

    if (
      !valorPagamento ||
      Number.isNaN(valorPagamento) ||
      valorPagamento <= 0
    ) {
      setMessage("❌ Valor de pagamento inválido.");
      if (onError) onError("Valor de pagamento inválido.");
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setMessage("❌ Campo do cartão não encontrado.");
      if (onError) onError("Campo do cartão não encontrado.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const paymentIntentData = await api.post("/trip/pagamento/create", {
        amount: Math.round(valorPagamento * 100),
        trip_id: tripId,
        description: `Pagamento de Viagem - ${tripId}`,
      });

      if (!paymentIntentData || !paymentIntentData.client_secret) {
        throw new Error("Erro ao criar pagamento.");
      }

      const billingDetails = {
        name: user?.name || user?.username || "Cliente",
      };

      if (user?.email) {
        billingDetails.email = user.email;
      }

      const result = await stripe.confirmCardPayment(
        paymentIntentData.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: billingDetails,
          },
        }
      );

      if (result.error) {
        setMessage(`❌ Erro: ${result.error.message}`);
        if (onError) onError(result.error.message);
        return;
      }

      if (result.paymentIntent.status !== "succeeded") {
        setMessage(`⚠️ Status do pagamento: ${result.paymentIntent.status}`);
        return;
      }

      const confirmData = await api.post("/trip/pagamento/confirm", {
        payment_intent_id: result.paymentIntent.id,
        trip_id: tripId,
      });

      if (!confirmData) {
        throw new Error("Erro ao confirmar pagamento.");
      }

      setMessage(`✅ Pagamento realizado com sucesso! ${valorPagamento.toFixed(2)} EUR`);

      if (onSuccess) {
        onSuccess(confirmData);
      }
    } catch (error) {
      console.error("[PAYMENT] Erro:", error);
      const errorMessage = error.message || "Erro ao processar pagamento.";
      setMessage(`❌ ${errorMessage}`);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.cardContainer}>
        <label>Cartão de Crédito</label>

        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#fa755a",
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className={styles.button}
      >
        {loading
          ? "⏳ Processando..."
          : `💳 Pagar ${Number(amount).toFixed(2)} EUR`}
      </button>

      {message && (
        <div
          className={`${styles.message} ${
            message.includes("❌") ? styles.error : styles.success
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}