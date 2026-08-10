import { Doc } from './Doc';

// Un documento en cola esperando ser convertido en una Ausencia. No duplica nada del Doc: el
// backend ya viene con el Doc completo embebido para no tener que pedirlo aparte.
export interface NovedadResponseDTO {
  id: string;
  doc: Doc;
}
