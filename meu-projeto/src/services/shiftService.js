import { api } from './api';

/**
 * Verifica se o motorista tem um turno ativo
 */
export async function verificarTurnoAtivo(motoristId) {
  try {
    console.log('[SHIFT] Verificando turnos para motorista ID:', motoristId);
    const response = await api.get(`/shift/driver/${motoristId}/`);
    console.log('[SHIFT] Resposta do backend:', response);
    
    // O backend retorna uma lista de shifts. Procuramos um com status 'active'
    if (response && response.shifts && Array.isArray(response.shifts)) {
      console.log('[SHIFT] Turnos encontrados:', response.shifts);
      const turnoAtivo = response.shifts.find(shift => shift.status_shift === 'active');
      console.log('[SHIFT] Turno ativo:', turnoAtivo);
      return turnoAtivo || null;
    }
    
    console.log('[SHIFT] Resposta não tem shifts:', response);
    return null;
  } catch (error) {
    console.error('[SHIFT] Erro ao verificar turno ativo:', error);
    console.error('[SHIFT] Erro detalhado:', error.message);
    // Retorna null para que motorista vá para página de criar turno
    return null;
  }
}

/**
 * Termina um shift (turno) ativo
 */
export async function terminarShift(shiftId) {
  try {
    const response = await api.post(`/shift/${shiftId}/terminar/`, {});
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao terminar turno' };
  }
}

/**
 * Lista shifts de um motorista
 */
export async function listarShiftsMotorista(motoristId) {
  try {
    const response = await api.get(`/shift/driver/${motoristId}/`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao listar turnos' };
  }
}

/**
 * Obtém um shift específico
 */
export async function obterShift(shiftId) {
  try {
    const response = await api.get(`/shift/${shiftId}/`);
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao obter turno' };
  }
}

/**
 * Cria um novo shift
 */
export async function criarShift(shiftData) {
  try {
    const response = await api.post('/shift/registar/', {
      driver: shiftData.driverId,
      taxi: shiftData.taxiId,
      start_date: shiftData.startDate,
      end_date: shiftData.endDate,
      status_shift: shiftData.statusShift || 'active',
    });
    return response;
  } catch (error) {
    throw { message: error.message || 'Erro ao criar turno' };
  }
}
