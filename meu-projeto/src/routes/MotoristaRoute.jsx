import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function MotoristaRoute({ children }) {
  const { user } = useContext(AuthContext);

  // Verifica se há um turno ativo no localStorage
  const turnoAtivo = localStorage.getItem('turno_ativo');

  // Se não há turno ativo e não está na página de iniciar turno, redireciona
  if (!turnoAtivo && window.location.pathname !== '/motorista/turno') {
    return <Navigate to="/motorista/turno" replace />;
  }

  return children;
}
