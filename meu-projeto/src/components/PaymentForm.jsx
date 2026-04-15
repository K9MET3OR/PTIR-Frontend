import React, { useState } from 'react';
import { loadStripe } from '@stripe/js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styles from './PaymentForm.module.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function PaymentForm({ tripId, amount, onSuccess, onError }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm tripId={tripId} amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

function CheckoutForm({ tripId, amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('taxigest_token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setMessage('Stripe não está carregado');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 1. Criar payment intent no backend
      const response = await fetch('/api/trip/pagamento/criar/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // converter para centavos
          trip_id: tripId,
          description: `Pagamento de Viagem - ${tripId}`
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pagamento');
      }

      // 2. Confirmar pagamento com Stripe
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: 'Cliente Taxi' }
        }
      });

      if (result.error) {
        setMessage(`❌ Erro: ${result.error.message}`);
        if (onError) onError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        // 3. Confirmar no backend
        const confirmResponse = await fetch('/api/trip/pagamento/confirmar/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payment_intent_id: result.paymentIntent.id,
            trip_id: tripId
          })
        });

        const confirmData = await confirmResponse.json();
        
        if (confirmResponse.ok) {
          setMessage(`✅ Pagamento realizado com sucesso! ${amount.toFixed(2)} EUR`);
          if (onSuccess) onSuccess(confirmData.trip);
        } else {
          throw new Error(confirmData.message || 'Erro ao confirmar pagamento');
        }
      } else {
        setMessage(`⚠️ Status do pagamento: ${result.paymentIntent.status}`);
      }
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      if (onError) onError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.cardContainer}>
        <label>Cartão de Crédito</label>
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#fa755a',
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
        {loading ? '⏳ Processando...' : `💳 Pagar ${amount.toFixed(2)} EUR`}
      </button>

      {message && (
        <div className={`${styles.message} ${message.includes('❌') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}
    </form>
  );
}
