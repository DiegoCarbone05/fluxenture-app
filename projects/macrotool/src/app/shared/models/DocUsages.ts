// Ids de los registros que usan un Doc, agrupados por nombre de modulo ("absent", "employeeHistory",
// "cd", y los que se sumen despues). Ejemplo: { absent: ["a1"], cd: ["c1", "c2"] }
export interface DocUsages {
  byModule: Record<string, string[]>;
}
