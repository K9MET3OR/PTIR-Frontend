// Táxis mock espalhados por Lisboa
export const TAXIS_MOCK = [
  { id: 1, matricula: "AA-00-BB", motorista: "João Silva",  lon: -9.1393, lat: 38.7223, estado: "disponivel", nivel_conforto: "Standard" },
  { id: 2, matricula: "CC-11-DD", motorista: "Maria Costa", lon: -9.1500, lat: 38.7300, estado: "disponivel", nivel_conforto: "Conforto" },
  { id: 3, matricula: "EE-22-FF", motorista: "Carlos Matos",lon: -9.1250, lat: 38.7150, estado: "em_viagem",  nivel_conforto: "Premium"  },
  { id: 4, matricula: "GG-33-HH", motorista: "Ana Ferreira",lon: -9.1600, lat: 38.7100, estado: "disponivel", nivel_conforto: "Standard" },
  { id: 5, matricula: "II-44-JJ", motorista: "Rui Santos",  lon: -9.1100, lat: 38.7350, estado: "em_viagem",  nivel_conforto: "Conforto" },
];

// Cores por estado do táxi
export const COR_ESTADO = {
  disponivel:   "#16a34a",  // verde
  indisponivel: "#ea580c",  // laranja
  ocupado:      "#dc2626",  // vermelho
  em_viagem:    "#dc2626",  // vermelho (compatibilidade)
  offline:      "#94a3b8",  // cinzento
};

// Pedidos mock para o motorista
export const PEDIDOS_MOCK = [
  {
    id: 1,
    cliente: "Pedro Alves",
    origem:  { label: "Aeroporto de Lisboa", lon: -9.1354, lat: 38.7742 },
    destino: { label: "Rossio, Lisboa",       lon: -9.1398, lat: 38.7139 },
    n_pessoas: 2,
    nivel_conforto: "Standard",
    estado: "pendente",
  },
  {
    id: 2,
    cliente: "Sara Lopes",
    origem:  { label: "Marquês de Pombal",   lon: -9.1499, lat: 38.7267 },
    destino: { label: "Belém, Lisboa",        lon: -9.2157, lat: 38.6969 },
    n_pessoas: 1,
    nivel_conforto: "Conforto",
    estado: "pendente",
  },
];