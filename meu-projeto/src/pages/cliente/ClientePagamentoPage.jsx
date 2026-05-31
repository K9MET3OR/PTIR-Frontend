import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PaymentForm from "../../components/PaymentForm";
import { obterDetalheViagem } from "../../services/tripService";
import styles from "./ClientePagamentoPage.module.css";

export default function ClientePagamentoPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tripId = searchParams.get("tripId");
  const amountFromUrl = parseFloat(searchParams.get("amount")) || 0;

  const [tripDetails, setTripDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [pagamentoSucesso, setPagamentoSucesso] = useState(false);
  const [finalAmount, setFinalAmount] = useState(0); // Preço final da viagem em EUR

  useEffect(() => {
    const carregarDetalhesViagem = async () => {
      if (!tripId) {
        setErro("Viagem não encontrada.");
        setLoading(false);
        return;
      }

      try {
        const response = await obterDetalheViagem(tripId);
        const viagem = response.trip || response.data;

        if (!viagem) {
          setErro("Não foi possível carregar os detalhes da viagem.");
          setLoading(false);
          return;
        }

        // Calcular distância (Haversine) se coordenadas disponíveis
        // Converter para número se for string
        let distanciaKm = parseFloat(viagem.n_kms) || 0;
        
        // Usar o preço do backend (que é a fonte verdadeira)
        const precoViagem = parseFloat(viagem.price) || amountFromUrl || 0;
        setFinalAmount(precoViagem);

        setTripDetails({
          id: viagem.id,
          origin: viagem.start_location || "Não especificada",
          destination: viagem.end_location || "Não especificada",
          distance: `${distanciaKm.toFixed(1)} km`,
          nPeople: viagem.n_people || 1,
          nivelConforto: viagem.nivel_conforto || "Standard",
          driverName: viagem.driver_name || "Motorista",
          taxiMatricula: viagem.taxi_matricula || "N/A",
          status: viagem.status_trip || "pending",
        });
      } catch (error) {
        console.error("Erro ao carregar viagem:", error);
        setErro("Erro ao carregar detalhes da viagem. Tenta novamente.");
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhesViagem();
  }, [tripId]);

  const handlePaymentSuccess = (data) => {
    console.log("Pagamento realizado com sucesso:", data);
    setPagamentoSucesso(true);

    // Redirecionar para página de confirmação ou listar viagens após 2 segundos
    setTimeout(() => {
      navigate("/cliente/pedir");
    }, 2000);
  };

  const handlePaymentError = (error) => {
    console.error("Erro no pagamento:", error);
    setErro(error);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>A carregar...</div>
      </div>
    );
  }

  if (!tripId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Erro: Viagem não encontrada.</p>
          <button onClick={() => navigate("/cliente/pedir")}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (pagamentoSucesso) {
    return (
      <div className={styles.container}>
        <div className={styles.sucesso}>
          <div className={styles.sucessoIcon}>✓</div>
          <h2>Viagem Paga!</h2>
          <p>O seu pagamento foi processado com sucesso.</p>
          <p>A redirecionar em breve...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1>Pagamento da Viagem</h1>

        {tripDetails && (
          <div className={styles.tripSummary}>
            <h3>Resumo da Viagem</h3>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Origem:</span>
              <span>{tripDetails.origin}</span>
            </div>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Destino:</span>
              <span>{tripDetails.destination}</span>
            </div>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Distância:</span>
              <span>{tripDetails.distance}</span>
            </div>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Pessoas:</span>
              <span>{tripDetails.nPeople}</span>
            </div>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Nível de Conforto:</span>
              <span>{tripDetails.nivelConforto}</span>
            </div>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Motorista:</span>
              <span>{tripDetails.driverName}</span>
            </div>
            <div className={styles.tripDetail}>
              <span className={styles.label}>Matrícula:</span>
              <span>{tripDetails.taxiMatricula}</span>
            </div>
            <div className={styles.tripDetail + " " + styles.priceHighlight}>
              <span className={styles.label}>Valor Total:</span>
              <span>{finalAmount.toFixed(2)} €</span>
            </div>
          </div>
        )}

        {erro && (
          <div className={styles.errorMessage}>
            <p>{erro}</p>
          </div>
        )}

        <div className={styles.paymentFormWrapper}>
          <h3>Dados de Pagamento</h3>
          <PaymentForm
            tripId={tripId}
            amount={finalAmount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>

        <button
          className={styles.backButton}
          onClick={() => navigate(`/cliente/pedir?tripId=${tripId}&resume=payment`)}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
