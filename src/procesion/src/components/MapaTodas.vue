<template>
  <div>
    <div ref="mapContainer" class="map"></div>

    <!-- Header con controles -->
    <div class="header-todas">
      <div class="header-top">
        <span class="titulo-todas">Seguimiento en vivo</span>
        <div class="controles">
          <button 
            :class="['btn-toggle', { activo: mostrarRecorridos }]"
            @click="toggleRecorridos"
          >
            <span class="btn-icon"></span>
            {{ mostrarRecorridos ? 'Ocultar recorridos' : 'Ver recorridos' }}
          </button>
          <button class="btn-actualizar" @click="cargarTodas">
            Actualizar
          </button>
        </div>
      </div>

      <!-- Leyenda de colores -->
      <div class="leyenda">
        <div 
          v-for="(proc, i) in procesiones" 
          :key="proc.id"
          class="leyenda-item"
          :class="{ inactivo: !ubicaciones[proc.id] }"
        >
          <span class="dot" :style="{ background: colores[i] }"></span>
          <span class="leyenda-nombre">{{ proc.nombre }}</span>
          <span v-if="ubicaciones[proc.id]" class="badge-live">LIVE</span>
          <span v-else class="badge-sin">sin datos</span>
        </div>
      </div>
    </div>

    <!-- Último reporte -->
    <div class="panel panel-todas">
      <p class="panel-titulo">Últimas posiciones reportadas</p>
      <div 
        v-for="(proc, i) in procesiones"
        :key="proc.id"
        class="item-todas"
        @click="ubicaciones[proc.id] && irA(proc.id)"
      >
        <span class="punto-color" :style="{ background: colores[i] }"></span>
        <span class="item-todas-nombre">{{ proc.nombre }}</span>
        <span v-if="ubicaciones[proc.id]" class="item-hora">
          {{ formatearFecha(ubicaciones[proc.id].ts) }}
        </span>
        <span v-else class="item-sin">Sin señal</span>
      </div>
    </div>
    <!-- Estadísticas -->
  <div class="panel panel-horarios">
  <div class="panel-header-flex">
    <p class="panel-titulo">Cronograma de hoy</p>
    <div class="filtros-orden">
      <button :class="{ activo: criterioOrden === 'salida' }" @click="criterioOrden = 'salida'">Salida</button>
      <button :class="{ activo: criterioOrden === 'entrada' }" @click="criterioOrden = 'entrada'">Entrada</button>
    </div>
  </div>

  <div class="tabla-horarios">
    <div 
      v-for="proc in procesionesOrdenadas" 
      :key="'horario-' + proc.id"
      class="item-horario"
      :class="{ 'ya-entro': haFinalizado(proc.entrada) }"
    >
      <div class="info-principal">
        <span class="item-todas-nombre">{{ proc.nombre }}</span>
        <span v-if="haFinalizado(proc.entrada)" class="badge-finalizado"> (ENTRÓ)</span>
      </div>
      
      <div class="horas-container">
        <div class="hora-bloque">
          <span class="valor">{{ formatearHoraArreglo(proc.salida) }}</span> 
          <span class="label">   - </span>
        </div>
        <div class="hora-bloque">
          <span class="valor">{{ formatearHoraArreglo(proc.entrada) }}</span>
        </div>
      </div>
    </div>
  </div>
</div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed} from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import { obtenerToken } from '../functions/token';
import { PROCESIONES, COLORES_PROCESION } from '../data/procesiones';

// =========================
// ESTADO
// =========================
const mapContainer = ref(null);
const map = ref(null);
const markers = ref({});
const layersRecorridos = ref({});
const ubicaciones = ref({});
const mostrarRecorridos = ref(false);
const intervalo = ref(null);

const procesiones = PROCESIONES;
const colores = COLORES_PROCESION;

const criterioOrden = ref('salida');
// =========================
// HELPERS
// =========================
const formatearFecha = ts => new Date(ts).toLocaleTimeString('es-GT');

const crearIcono = (color) => L.divIcon({
  html: `<div class="marker-todas-wrap" style="
      filter: drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px ${color});
    ">
    <div class="marker-ring" style="border-color:${color}; box-shadow: 0 0 0 2px ${color}40, 0 0 14px ${color}80;">
      <img
        src="https://gis.muniguate.com/procesiones/assets/icons/puntos_interes/2025/GPS2025.png"
        width="34"
        height="34"
        style="display:block;"
      />
    </div>
  </div>`,
  className: '',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -24],
});

// =========================
// URLS
// =========================
const getUrlTracking = (id, token) =>
  `https://sg.muniguate.com/server/rest/services/digm/digm_procesiones_2026/FeatureServer/1/query?f=json&outFields=*&spatialRel=esriSpatialRelIntersects&where=(recorrido_id%3D${id})%20AND%20(estado%20%3D%201)&token=${token}`;

const getUrlRecorrido = (id, token) =>
  `https://sg.muniguate.com/server/rest/services/digm/digm_procesiones_2026/FeatureServer/2/query?spatialRel=esriSpatialRelIntersects&f=json&outFields=*&where=(recorrido_id%3D${id})&token=${token}`;

// =========================
// CARGAR UNA PROCESIÓN
// =========================
const cargarUna = async (proc, index, token) => {
  try {
    const res = await fetch(getUrlTracking(proc.id, token));
    const data = await res.json();

    if (!data.features?.length) return;

    const puntos = data.features.sort(
      (a, b) => b.attributes.secuencia - a.attributes.secuencia
    );
    const mejor = puntos[0];
    const { x, y } = mejor.geometry;
    const color = colores[index];

    ubicaciones.value[proc.id] = {
      lat: y,
      lng: x,
      ts: mejor.attributes.esrignss_fixdatetime
    };

    const popupContent = `<b style="color:${color}">${proc.nombre}</b><br>${new Date(mejor.attributes.esrignss_fixdatetime).toLocaleTimeString('es-GT')}`;

    if (!markers.value[proc.id]) {
      markers.value[proc.id] = L.marker([y, x], { icon: crearIcono(color) })
        .addTo(map.value)
        .bindPopup(popupContent);
    } else {
      markers.value[proc.id].setLatLng([y, x]);
      markers.value[proc.id].setPopupContent(popupContent);
    }

  } catch (err) {
    console.error(`Error procesión ${proc.id}:`, err);
  }
};

// =========================
// CARGAR TODAS
// =========================
const cargarTodas = async () => {
  try {
    const token = await obtenerToken();
    await Promise.all(procesiones.map((proc, i) => cargarUna(proc, i, token)));
  } catch (err) {
    console.error(err);
  }
};

// Función para convertir [26, 15] -> "02:15 AM"
const formatearHoraArreglo = (array) => {
  if (!array || array.length !== 2) return 'N/A';
  let [h, m] = array;
  const diaSiguiente = h >= 24;
  const horaAjustada = h % 24;
  const ampm = horaAjustada >= 12 ? 'PM' : 'AM';
  const h12 = horaAjustada % 12 || 12;
  const min = String(m).padStart(2, '0');
  
  return `${h12}:${min} ${ampm}`;
};

// Lógica de ordenamiento avanzada
const procesionesOrdenadas = computed(() => {
  const ahora = new Date();
  const horaActualDecimal = ahora.getHours() + (ahora.getMinutes() / 60);

  return [...procesiones].sort((a, b) => {
    // 1. Prioridad: ¿Ya entró? (Si la hora actual > hora de entrada)
    const horaEntradaA = a.entrada[0] + (a.entrada[1] / 60);
    const horaEntradaB = b.entrada[0] + (b.entrada[1] / 60);
    
    const yaEntroA = horaActualDecimal > horaEntradaA;
    const yaEntroB = horaActualDecimal > horaEntradaB;

    if (yaEntroA && !yaEntroB) return 1;  // A va al final
    if (!yaEntroA && yaEntroB) return -1; // B va al final

    // 2. Si ambos están en el mismo estado, ordenar por el criterio seleccionado
    const valA = a[criterioOrden.value][0] + (a[criterioOrden.value][1] / 100);
    const valB = b[criterioOrden.value][0] + (b[criterioOrden.value][1] / 100);
    
    return valA - valB;
  });
});

// Función para saber si ya entró (para el template)
const haFinalizado = (entradaArray) => {
  const ahora = new Date();
  const actual = ahora.getHours() + (ahora.getMinutes() / 60);
  const entrada = entradaArray[0] + (entradaArray[1] / 60);
  return actual > entrada;
};

const cambiarOrden = (nuevoCriterio) => {
  criterioOrden.value = nuevoCriterio;
};
// =========================
// RECORRIDOS
// =========================
const cargarRecorrido = async (proc, index, token) => {
  try {
    const res = await fetch(getUrlRecorrido(proc.id, token));
    const data = await res.json();
    if (!data.features) return;

    if (!layersRecorridos.value[proc.id]) {
      layersRecorridos.value[proc.id] = L.layerGroup();
    } else {
      layersRecorridos.value[proc.id].clearLayers();
    }

    const color = colores[index];

    data.features.forEach(f => {
      if (!f.geometry?.paths) return;
      f.geometry.paths.forEach(path => {
        const latlngs = path.map(c => [c[1], c[0]]);
        const polyline = L.polyline(latlngs, {
          color,
          weight: 4,
          opacity: 0.75,
          lineJoin: 'round'
        }).addTo(layersRecorridos.value[proc.id]);

        L.polylineDecorator(polyline, {
          patterns: [{
            offset: 25,
            repeat: 120,
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              polygon: true,
              pathOptions: { color, fillOpacity: 1, weight: 0 }
            })
          }]
        }).addTo(layersRecorridos.value[proc.id]);
      });
    });

    if (mostrarRecorridos.value) {
      layersRecorridos.value[proc.id].addTo(map.value);
    }
  } catch (err) {
    console.error(`Error recorrido ${proc.id}:`, err);
  }
};

const toggleRecorridos = async () => {
  mostrarRecorridos.value = !mostrarRecorridos.value;

  if (mostrarRecorridos.value) {
    const token = await obtenerToken();
    // Cargar recorridos que aún no estén cargados
    await Promise.all(
      procesiones.map(async (proc, i) => {
        if (!layersRecorridos.value[proc.id]) {
          await cargarRecorrido(proc, i, token);
        } else {
          layersRecorridos.value[proc.id].addTo(map.value);
        }
      })
    );
  } else {
    Object.values(layersRecorridos.value).forEach(layer => {
      map.value.removeLayer(layer);
    });
  }
};

// =========================
// IR A PROCESIÓN
// =========================
const irA = (id) => {
  const ub = ubicaciones.value[id];
  if (ub) map.value.setView([ub.lat, ub.lng], 16);
};

// =========================
// INIT
// =========================
onMounted(() => {
  map.value = L.map(mapContainer.value).setView([14.64, -90.513], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map.value);

  cargarTodas();
  intervalo.value = setInterval(cargarTodas, 60000);
});

onUnmounted(() => {
  if (intervalo.value) clearInterval(intervalo.value);
});
</script>

<style scoped>
.map { height: 65vh; }

/* Header todas */
.header-todas {
  background: var(--card);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.titulo-todas {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-light);
}

.controles {
  display: flex;
  gap: 8px;
}

.btn-toggle, .btn-actualizar {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle.activo {
  background: rgba(94, 9, 130, 0.3);
  border-color: var(--primary);
  color: white;
}

.btn-toggle:hover, .btn-actualizar:hover {
  border-color: var(--primary);
  color: white;
}

/* Leyenda */
.leyenda {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.leyenda-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-light);
  transition: 0.2s;
}

.leyenda-item.inactivo {
  opacity: 0.4;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.badge-live {
  background: #16a34a;
  color: white;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.badge-sin {
  font-size: 9px;
  color: var(--text-light);
  opacity: 0.6;
}

/* Panel todas */
.panel-todas {
  max-height: 200px;
}

.panel-titulo {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-light);
  margin: 0 0 8px 0;
}

.item-todas {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}

.item-todas:hover {
  background: var(--card);
}

.punto-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-todas-nombre {
  flex: 1;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-hora {
  font-size: 11px;
  color: #10b981;
  font-weight: 600;
  flex-shrink: 0;
}

.item-sin {
  font-size: 11px;
  color: var(--text-light);
  opacity: 0.5;
  flex-shrink: 0;
}
</style>

<style>
/* Contenedor del marcador GPS coloreado */
.marker-todas-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-ring {
  border-radius: 50%;
  border: 2px solid;
  padding: 2px;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-gps 2s ease-in-out infinite;
}

@keyframes pulse-gps {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
</style>