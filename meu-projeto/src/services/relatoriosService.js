import { api } from './api';

/**
 * User Story 14: Obter relatórios sobre táxis e motoristas
 */
export async function obterRelatorioTaxisMotoristas(startDate = null, endDate = null) {
  try {
    let url = '/reports/taxis-motoristas/';
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao obter relatório de táxis e motoristas' };
  }
}

/**
 * User Story 15: Obter relatórios sobre clientes e faturação
 */
export async function obterRelatorioClientesFaturacao(startDate = null, endDate = null) {
  try {
    let url = '/reports/clientes-faturacao/';
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao obter relatório de clientes e faturação' };
  }
}

/**
 * User Story 16: Obter relatórios sobre reabastecimentos de táxis
 */
export async function obterRelatorioReabastecimentos(startDate = null, endDate = null) {
  try {
    let url = '/reports/reabastecimentos/';
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao obter relatório de reabastecimentos' };
  }
}
