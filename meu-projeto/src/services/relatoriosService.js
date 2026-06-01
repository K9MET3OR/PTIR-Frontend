import { api } from './api';

/**
 * User Story 14: Obter relatórios sobre táxis e motoristas
 */
export async function obterRelatorioTaxisMotoristas(startDate = null, endDate = null) {
  try {
    const params = new URLSearchParams();

    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';

    const summaryResponse = await api.get(`/report/trips/summary${query}`);
    const driverResponse = await api.get(`/report/trips/by-driver${query}`);
    const taxiResponse = await api.get(`/report/trips/by-taxi${query}`);

    const summaryData = summaryResponse.data || summaryResponse;
    const driverData = driverResponse.data || driverResponse;
    const taxiData = taxiResponse.data || taxiResponse;

    return {
      data: {
        summary: summaryData,
        drivers: driverData.drivers || [],
        taxis: taxiData.taxis || []
      }
    };
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter relatório de táxis e motoristas'
    };
  }
}

export async function obterDetalhesViagensMotorista(driverId, metric, startDate = null, endDate = null) {
  try {
    const params = new URLSearchParams();

    params.append('driver_id', driverId);
    params.append('metric', metric || 'trips');

    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    const response = await api.get(`/report/trips/driver-details?${params.toString()}`);
    return response.data || response;
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter detalhes das viagens do motorista'
    };
  }
}

export async function obterDetalhesViagensTaxi(taxiId, metric, startDate = null, endDate = null) {
  try {
    const params = new URLSearchParams();

    params.append('taxi_id', taxiId);
    params.append('metric', metric || 'trips');

    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    const response = await api.get(`/report/trips/taxi-details?${params.toString()}`);
    return response.data || response;
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter detalhes das viagens do táxi'
    };
  }
}

export async function obterDetalheViagem(tripId) {
  try {
    const response = await api.get(`/report/trips/detail/${tripId}`);
    return response.data || response;
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter detalhes da viagem'
    };
  }
}

export async function obterDetalheMotorista(driverId) {
  try {
    const response = await api.get(`/report/drivers/detail/${driverId}`);
    return response.data || response;
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter detalhes do motorista'
    };
  }
}

export async function obterDetalheTaxi(taxiId) {
  try {
    const response = await api.get(`/report/taxis/detail/${taxiId}`);
    return response.data || response;
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter detalhes do táxi'
    };
  }
}

/**
 * User Story 15: Obter relatórios sobre clientes e faturação
 */
export async function obterRelatorioClientesFaturacao(startDate = null, endDate = null) {
  try {
    const params = new URLSearchParams();

    // O backend usa "start" e "end"
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';

    const summaryResponse = await api.get(`/report/billing/summary${query}`);
    const clientResponse = await api.get(`/report/billing/by-client${query}`);

    const summaryData = summaryResponse.data || summaryResponse;
    const clientData = clientResponse.data || clientResponse;

    return {
      data: {
        summary: summaryData,
        clients: clientData.clients || []
      }
    };
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter relatório de clientes e faturação'
    };
  }
}

/**
 * User Story 16: Obter relatórios sobre reabastecimentos de táxis
 */
export async function obterRelatorioReabastecimentos(startDate = null, endDate = null) {
  try {
    const params = new URLSearchParams();

    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';

    const summaryResponse = await api.get(`/report/refuel/summary${query}`);
    const motorResponse = await api.get(`/report/refuel/by-motor-type${query}`);

    const summaryData = summaryResponse.data || summaryResponse;
    const motorData = motorResponse.data || motorResponse;

    return {
      data: {
        summary: summaryData,
        motorTypes: motorData.motor_types || []
      }
    };
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter relatório de reabastecimentos'
    };
  }
}

/**
 * User Story 16: Obter táxis que explicam um subtotal por tipo de motor
 */
export async function obterRelatorioReabastecimentosPorTaxi(
  tipoMotor,
  metric = 'euros',
  startDate = null,
  endDate = null
) {
  try {
    const params = new URLSearchParams();

    params.append('tipo_motor', tipoMotor);
    params.append('metric', metric);

    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    const response = await api.get(`/report/refuel/by-taxi?${params.toString()}`);

    return response.data || response;
  } catch (error) {
    throw {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Erro ao obter detalhes dos reabastecimentos por táxi'
    };
  }
}