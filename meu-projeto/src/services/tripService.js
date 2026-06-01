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

export async function listarViagens() {
  try {
    const response = await api.get('/trip/');
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens' };
  }
}

export async function obterDetalheViagem(tripId) {
  try {
    const response = await api.get(`/trip/${tripId}`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao obter detalhes da viagem' };
  }
}

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

export async function rejeitarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/reject`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao rejeitar viagem' };
  }
}

export async function finalizarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/finish`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao finalizar viagem' };
  }
}

export async function atualizarViagem(tripId, updateData) {
  try {
    const response = await api.patch(`/trip/${tripId}`, updateData);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao atualizar viagem' };
  }
}

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

export async function listarViagensPendentes(driverId) {
  try {
    const data = await api.get('/trip/');
    if (data.trips) {
      data.trips = data.trips.filter((trip) => {
        const rejeitados = trip.rejected_driver_ids || [];

        return (
          trip.status_trip === 'pending' &&
          !rejeitados.includes(driverId)
        );
      });
      data.total = data.trips.length;
    }
    return data;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens pendentes' };
  }
}

export async function listarViagensAceitesMotorista(driverId) {
  try {
    const data = await api.get('/trip/');
    if (data.trips) {
      data.trips = data.trips.filter(
        trip =>
          trip.driver_id === driverId &&
          (
            trip.status_trip === 'driver_accepted' ||
            trip.status_trip === 'client_confirmed' ||
            trip.status_trip === 'in_progress' ||
            trip.status_trip === 'awaiting_payment'
          )
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
    const response = await api.get(`/trip/driver/${driverId}`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar viagens finalizadas' };
  }
}

export async function confirmarMotoristaCliente(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/client-confirm`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao confirmar motorista' };
  }
}

export async function rejeitarMotoristaCliente(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/client-reject`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao rejeitar motorista' };
  }
}

export async function iniciarViagem(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/start`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao iniciar viagem' };
  }
}

export async function cancelarEsperaMotorista(tripId) {
  try {
    const response = await api.post(`/trip/${tripId}/cancel-driver-wait`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao cancelar espera do cliente' };
  }
}