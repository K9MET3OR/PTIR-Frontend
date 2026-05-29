import { api } from './api';

/**
 * Cria uma nova solicitação de viagem
 */
export async function criarSolicitacaoViagem(tripData) {
  try {
    const response = await api.post('/trip/register', {
      client_id: tripData.clientId,
      start_location: tripData.startLocation,
      end_location: tripData.endLocation,
      n_people: tripData.nPeople,
      n_kms: tripData.nKms,
      price: tripData.price,
      start_date: tripData.startDate,
      nivel_conforto: tripData.nivelConforto,
      status_trip: 'pending',
    });
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao criar solicitação de viagem' };
  }
}

/**
 * Lista todas as viagens
 */
export async function listarViagens() {
  try {
    const response = await api.get('/trip/');
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens' };
  }
}

/**
 * Obtém os detalhes de uma viagem específica
 */
export async function obterDetalheViagem(tripId) {
  try {
    const response = await api.get(`/trip/${tripId}`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao obter detalhes da viagem' };
  }
}

/**
 * Motorista aceita uma viagem
 */
export async function aceitarViagem(tripId, driverId) {
  try {
    const response = await api.post(`/trip/${tripId}/accept`, {
      driver_id: driverId,
    });
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao aceitar viagem' };
  }
}

/**
 * Motorista rejeita uma viagem
 */
export async function rejeitarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/reject`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao rejeitar viagem' };
  }
}

/**
 * Finaliza uma viagem
 */
export async function finalizarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/finish`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao finalizar viagem' };
  }
}

/**
 * Atualiza dados de uma viagem
 */
export async function atualizarViagem(tripId, updateData) {
  try {
    const response = await api.patch(`/trip/${tripId}`, updateData);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao atualizar viagem' };
  }
}

/**
 * Cria uma intenção de pagamento Stripe
 */
export async function criarIntencaoPagamento(tripId, amount) {
  try {
    const response = await api.post('/trip/pagamento/create', {
      trip_id: tripId,
      amount: amount,
      description: `Pagamento de viagem - ${tripId}`,
    });
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao criar intenção de pagamento' };
  }
}

/**
 * Confirma um pagamento Stripe
 */
export async function confirmarPagamento(tripId, paymentIntentId) {
  try {
    const response = await api.post('/trip/pagamento/confirm', {
      trip_id: tripId,
      payment_intent_id: paymentIntentId,
    });
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao confirmar pagamento' };
  }
}

/**
 * Lista viagens de um cliente específico
 */
export async function listarViagensCliente(clientId) {
  try {
    const data = await api.get('/trip/');
    if (data.trips) {
      data.trips = data.trips.filter(trip => trip.client_id === clientId);
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens do cliente' };
  }
}

/**
 * Lista viagens pendentes para um motorista aceitar
 */
export async function listarViagensPendentes() {
  try {
    const data = await api.get('/trip/');
    if (data.trips) {
      data.trips = data.trips.filter(trip => trip.status_trip === 'pending');
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens pendentes' };
  }
}

/**
 * Lista viagens aceites de um motorista
 */
export async function listarViagensAceitesMotorista(driverId) {
  try {
    const data = await api.get('/trip/');
    if (data.trips) {
      data.trips = data.trips.filter(
        trip =>
          trip.driver_id === driverId &&
          (trip.status_trip === 'accepted' || trip.status_trip === 'in_progress')
      );
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens do motorista' };
  }
}


export async function listarViagensFinalizadasMotorista(driverId) {
  try {
    const data = await api.get('/trip/');
    if (data.trips) {
      data.trips = data.trips.filter(
        trip => trip.driver_id === driverId && trip.status_trip === 'finished'
      );
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens finalizadas' };
  }
}