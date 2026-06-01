import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PaymentForm from "../../components/PaymentForm";
import { obterDetalheViagem } from "../../services/tripService";
import styles from "./ClientePagamentoPage.module.css";

export default function ClientePagamentoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tripId = searchParams.get("tripId");
  const amountFromUrl = parseFloat(searchParams.get("amount")) || 0;

  const [tripDetails, setTripDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [pagamentoSucesso, setPagamentoSucesso] = useState(false);
  const [finalAmount, setFinalAmount] = useState(0);

  useEffect(() => {
    const carregarDetalhesViagem = async () => {
      if (!tripId) {
        setErro("Viagem não encontrada.");
        setLoading(false);
        return;
      }

      try {
        const response = await obterDetalheViagem(tripId);
        const viagem = response?.trip || response?.data || response;

        if (!viagem) {
          setErro("Não foi possível carregar os detalhes da viagem.");
          setLoading(false);
          return;
        }

        const distanciaKm = parseFloat(viagem.n_kms) || 0;
        const precoViagem = parseFloat(viagem.price) || amountFromUrl || 0;

        setFinalAmount(precoViagem);

        setTripDetails({
          id: viagem.id,
          origin: viagem.start_location || "Não especificada",
          destination: viagem.end_location || "Não especificada",
          distance: `${distanciaKm.toFixed(1)} km`,
          nPeople: viagem.n_people || 1,
          nivelConforto: viagem.nivel_conforto || "Básico",
          driverName: viagem.driver_name || "Motorista",
          taxiMatricula: viagem.taxi_matricula || "N/A",
          status: viagem.status_trip || "pending",
        });

        if (viagem.status_trip === "finished") {
          setPagamentoSucesso(true);

          setTimeout(() => {
            navigate(`/cliente/pedir?tripId=${viagem.id}&resume=payment`, {
              replace: true,
            });
          }, 1500);

          return;
        }

        if (viagem.status_trip !== "awaiting_payment") {
          setErro(
            "Esta viagem ainda não está pronta para pagamento ou já não pode ser paga."
          );
        }
      } catch (error) {
        console.error("Erro ao carregar viagem:", error);
        setErro("Erro ao carregar detalhes da viagem. Tenta novamente.");
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhesViagem();
  }, [tripId, amountFromUrl, navigate]);

  const handlePaymentSuccess = (data) => {
    console.log("Pagamento realizado com sucesso:", data);

    const tripConfirmada = data?.trip || data?.data?.trip || null;
    const idFinal = tripConfirmada?.id || tripId;

    localStorage.removeItem("cliente_trip_id");

    setPagamentoSucesso(true);
    setErro(null);

    setTimeout(() => {
      navigate(`/cliente/pedir?tripId=${idFinal}&resume=payment`, {
        replace: true,
      });
    }, 1500);
  };

  const handlePaymentError = (error) => {
    console.error("Erro no pagamento:", error);
    setErro(error?.message || error || "Erro ao processar pagamento.");
  };

  const handleVoltar = () => {
    if (tripId) {
      navigate(`/cliente/pedir?tripId=${tripId}&resume=payment`);
      return;
    }

    navigate("/cliente/pedir");
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
          <button onClick={() => navigate("/cliente/pedir")}>Voltar</button>
        </div>
      </div>
    );
  }

  if (pagamentoSucesso) {
    return (
      <div className={styles.container}>
        <div className={styles.sucesso}>
          <div className={styles.sucessoIcon}>✓</div>
          <h2>Viagem paga!</h2>
          <p>O pagamento foi confirmado com sucesso.</p>
          <p>A voltar ao resumo da viagem...</p>
        </div>
      </div>
    );
  }

  const podePagar = tripDetails?.status === "awaiting_payment" && finalAmount > 0;

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

            <div className={`${styles.tripDetail} ${styles.priceHighlight}`}>
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

        {podePagar && (
          <div className={styles.paymentFormWrapper}>
            <h3>Dados de Pagamento</h3>
            <PaymentForm
              tripId={tripId}
              amount={finalAmount}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        )}

        {!podePagar && !erro && (
          <div className={styles.errorMessage}>
            <p>Esta viagem não está disponível para pagamento.</p>
          </div>
        )}

        <button className={styles.backButton} onClick={handleVoltar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}