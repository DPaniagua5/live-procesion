// Horarios en formato 24h [HH, MM]
// salida: hora en que sale la procesión
// entrada: hora en que regresa (si es después de medianoche, se suma 24h internamente)
export const PROCESIONES = [
  {
    id: 202229,
    nombre: "Jesús Nazareno de la Merced",
    nombreCompleto: "Procesión Penitencial Jesús Nazareno de la Merced y Santísima Virgen de Dolores, Parroquia La Merced",
    salida:  [2,  0],
    entrada: [14, 30],
    coordenadas: { lat: 14.6427361, lng: -90.5077708 }  // Parroquia La Merced
  },
  {
    id: 202303,
    nombre: "Cristo Yacente de las Ánimas",
    nombreCompleto: "Procesión Cristo Yacente de las Animas y Nuestra Señora de Soledad, Parroquia Rectoral de San Sebastián",
    salida:  [14, 45],
    entrada: [20,  0],
    coordenadas: { lat: 14.6461513, lng: -90.5126031 }  // Parroquia San Sebastián
  },
  {
    id: 202213,
    nombre: "Santo Cristo Yacente – El Calvario",
    nombreCompleto: "Procesión de C.I. del Santo Cristo Yacente y C.I. Virgen de Dolores, Parroquia Nuestra Señora de los Remedios El Calvario",
    salida:  [15,  0],
    entrada: [26, 15],  // 02:15 del día siguiente → 24+2=26
    coordenadas: { lat: 14.6304302, lng: -90.514905 }   // El Calvario
  },
  {
    id: 202307,
    nombre: "Señor Sepultado Cristo del Amor – Santo Domingo",
    nombreCompleto: "Procesión del Señor Sepultado Cristo del Amor y Nuestra Señora de la Soledad, Basílica de Nuestra Señora del Rosario Templo de Santo Domingo",
    salida:  [15,  0],
    entrada: [25, 15],  // 01:15 → 24+1=25
    coordenadas: { lat: 14.6378125, lng: -90.5069205 }  // Santo Domingo
  },
  {
    id: 202210,
    nombre: "Señor Sepultado – La Recolección",
    nombreCompleto: "Procesión del Señor Sepultado y Santísima Virgen de Soledad, Parroquia del Santísimo Nombre de Jesús, Templo de la Recolección",
    salida:  [15, 30],
    entrada: [27, 30],  // 03:30 → 24+3=27
    coordenadas: { lat: 14.6468478, lng: -90.517145 }   // La Recolección
  },
  {
    id: 202209,
    nombre: "Señor Sepultado Franciscano – San Francisco",
    nombreCompleto: "Procesión del Señor Sepultado Franciscano de la Penitencia y Virgen de Soledad Franciscana, Templo Histórico de San Francisco",
    salida:  [16,  0],
    entrada: [25, 15],  // 01:15 → 24+1=25
    coordenadas: { lat: 14.6357202, lng: -90.5138073 }  // San Francisco
  },
  {
    id: 202304,
    nombre: "Señor Sepultado – Santa Catalina",
    nombreCompleto: "Procesión del Señor Sepultado, Rectoría Santa Catalina",
    salida:  [19,  0],
    entrada: [25,  0],  // 01:00 → 24+1=25
    coordenadas: { lat: 14.643609,  lng: -90.5155557 }  // Santa Catalina
  }
];

// Colores únicos para cada procesión en la vista TODAS
export const COLORES_PROCESION = [
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ec4899',
  '#f97316',
  '#06b6d4',
  '#84cc16'
];

// Devuelve true si la procesión está activa en este momento
export const estaActiva = (proc) => {
  const ahora = new Date();
  // Minutos totales desde medianoche del día actual
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  const salidaMin  = proc.salida[0]  * 60 + proc.salida[1];
  const entradaMin = proc.entrada[0] * 60 + proc.entrada[1];

  if (entradaMin > 1440) {
    return minutosAhora >= salidaMin || (minutosAhora + 1440) <= entradaMin;
  }

  return minutosAhora >= salidaMin && minutosAhora <= entradaMin;
};