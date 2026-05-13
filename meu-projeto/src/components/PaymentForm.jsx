import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import styles from './PaymentForm.module.css';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY?.trim();
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function PaymentForm({ tripId, amount, onSuccess, onError }) {
  if (!stripeKey) {
    return <div className={styles.error}>Erro: Stripe publishable key não configurada.</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm tripId={tripId} amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

function CheckoutForm({ tripId, amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);

  // Carregar dados do utilizador para preencher billing details
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const response = await api.get(`/user/${user.id}/`);
        setUserData(response);
      } catch (error) {
        console.error('Erro ao carregar dados do utilizador:', error);
      }
    };
    loadUserData();
  }, [user]);

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
      const data = await api.post('/trip/pagamento/create', {
        amount: Math.round(amount * 100), // converter para centavos
        trip_id: tripId,
        description: `Pagamento de Viagem - ${tripId}`
      });

      if (!data || !data.client_secret) {
        throw new Error('Erro ao criar pagamento');
      }

      // 2. Preparar billing details com dados do utilizador
      const billingDetails = {
        name: user?.name || 'Cliente',
        email: userData?.email || '',
        phone: userData?.mobile || '',
        address: {
          line1: userData?.address || 'Rua Principal',
          postal_code: userData?.codigo_postal || '1234-567',
          city: userData?.city || 'Lisboa',
          country: 'PT'
        }
      };

      // 3. Confirmar pagamento com Stripe
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: billingDetails
        }
      });

      if (result.error) {
        setMessage(`❌ Erro: ${result.error.message}`);
        if (onError) onError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        // 4. Confirmar no backend
        const confirmData = await api.post('/trip/pagamento/confirm', {
          payment_intent_id: result.paymentIntent.id,
          trip_id: tripId
        });

        if (confirmData) {
          setMessage(`✅ Pagamento realizado com sucesso! ${amount.toFixed(2)} EUR`);
          if (onSuccess) onSuccess(confirmData.trip);
        } else {
          throw new Error('Erro ao confirmar pagamento');
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
