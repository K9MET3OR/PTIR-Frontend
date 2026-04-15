import { api } from './api';

/**
 * Cria uma nova solicitação de viagem
 */
export async function criarSolicitacaoViagem(tripData) {
  try {
    const response = await api.post('/trip/registar/', {
      client_id: tripData.clientId,
      start_location: tripData.startLocation,
      end_location: tripData.endLocation,
      n_people: tripData.nPeople,
      n_kms: tripData.nKms,
      price: tripData.price,
      status_trip: 'pending',
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao criar solicitação de viagem' };
  }
}

/**
 * Lista todas as viagens
 */
export async function listarViagens() {
  try {
    const response = await api.get('/trip/listar/');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao listar viagens' };
  }
}

/**
 * Obtém os detalhes de uma viagem específica
 */
export async function obterDetalheViagem(tripId) {
  try {
    const response = await api.get(`/trip/${tripId}/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao obter detalhes da viagem' };
  }
}

/**
 * Motorista aceita uma viagem
 */
export async function aceitarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/accept/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao aceitar viagem' };
  }
}

/**
 * Motorista rejeita uma viagem
 */
export async function rejeitarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/reject/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao rejeitar viagem' };
  }
}

/**
 * Finaliza uma viagem
 */
export async function finalizarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/finish/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao finalizar viagem' };
  }
}

/**
 * Atualiza dados de uma viagem
 */
export async function atualizarViagem(tripId, updateData) {
  try {
    const response = await api.patch(`/trip/${tripId}/`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao atualizar viagem' };
  }
}

/**
 * Cria uma intenção de pagamento Stripe
 */
export async function criarIntencaoPagamento(tripId, amount) {
  try {
    const response = await api.post('/trip/pagamento/criar/', {
      trip_id: tripId,
      amount: amount,
      description: `Pagamento de viagem - ${tripId}`,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao criar intenção de pagamento' };
  }
}

/**
 * Confirma um pagamento Stripe
 */
export async function confirmarPagamento(tripId, paymentIntentId) {
  try {
    const response = await api.post('/trip/pagamento/confirmar/', {
      trip_id: tripId,
      payment_intent_id: paymentIntentId,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao confirmar pagamento' };
  }
}

/**
 * Lista viagens de um cliente específico
 */
export async function listarViagensCliente(clientId) {
  try {
    const response = await api.get('/trip/listar/');
    const data = response.data;
    // Filtrar para apenas viagens do cliente
    if (data.trips) {
      data.trips = data.trips.filter(trip => trip.client_id === clientId);
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao listar viagens do cliente' };
  }
}

/**
 * Lista viagens pendentes para um motorista aceitar
 */
export async function listarViagensPendentes() {
  try {
    const response = await api.get('/trip/listar/');
    const data = response.data;
    // Filtrar para apenas viagens com status pending
    if (data.trips) {
      data.trips = data.trips.filter(trip => trip.status_trip === 'pending');
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao listar viagens pendentes' };
  }
}

/**
 * Lista viagens aceites de um motorista
 */
export async function listarViagensAceitesMotorista(driverId) {
  try {
    const response = await api.get('/trip/listar/');
    const data = response.data;
    // Filtrar para viagens do motorista com status accepted ou in_progress
    if (data.trips) {
      data.trips = data.trips.filter(
        trip => trip.driver_id === driverId && 
        (trip.status_trip === 'accepted' || trip.status_trip === 'in_progress')
      );
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw error.response?.data || { message: 'Erro ao listar viagens do motorista' };
  }
}
