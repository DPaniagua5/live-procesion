<template>
  <div>
    <!-- MAPA -->
    <div ref="mapContainer" class="map"></div>
    <!-- INFO -->
    <div class="header">
      <div v-if="actual" class="info">
        <p><strong>Último reporte:</strong> {{ formatearFecha(actual.attributes.esrignss_fixdatetime) }}</p>
      </div>
      <button @click="cargarDatos">Actualizar</button>
    </div>
    <!-- LISTA DE PUNTOS -->
    <div class="panel">
      <div
        v-for="(p, i) in listaPuntos"
        :key="i"
        :class="['item', { 'item-salida': p.esSalida, 'item-entrada': p.esEntrada }]"
        @click="irAPunto(p)"
      >
        <b>{{ p.numero }}</b>
        <span>
          {{ p.ubicacion }}
          <small>{{ p.hora }}</small>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import { obtenerToken } from '../functions/token';

// =========================
// PROPS
// =========================
const props = defineProps({
  recorridoId:   Number,
  // procesionData: { salida:[H,M], entrada:[H,M], coordenadas:{lat,lng} }
  // Si no se pasa, no se muestran puntos de salida/entrada
  procesionData: { type: Object, default: null }
});

// =========================
// ESTADO
// =========================
const map                = ref(null);
const mapContainer       = ref(null);
const marker             = ref(null);
const actual             = ref(null);
const layerRecorridoReal = ref(null);
const layerPuntos        = ref(null);
const listaPuntos        = ref([]);

// =========================
// ICONOS
// =========================
const iconoGPS = L.icon({
  iconUrl:    'https://gis.muniguate.com/procesiones/assets/icons/puntos_interes/2025/GPS2025.png',
  iconSize:   [40, 40],
  iconAnchor: [20, 40],
});

const iconoNumero = (numero) => L.divIcon({
  html: `<div style="
    background:#5E0982;color:white;border-radius:50%;
    width:22px;height:22px;display:flex;
    align-items:center;justify-content:center;font-size:12px;
  ">${numero}</div>`,
  className: ''
});

// Marcador de salida: círculo verde con «S»
const iconoSalida = () => L.divIcon({
  html: `<div style="
    background:#15803d;color:white;border-radius:50%;
    width:26px;height:26px;display:flex;
    align-items:center;justify-content:center;
    font-size:13px;font-weight:800;
    box-shadow:0 0 0 3px #bbf7d0;
  ">S</div>`,
  className:  '',
  iconSize:   [26, 26],
  iconAnchor: [13, 13],
});

// Marcador de entrada: círculo granate con «E»
const iconoEntrada = () => L.divIcon({
  html: `<div style="
    background:#881337;color:white;border-radius:50%;
    width:26px;height:26px;display:flex;
    align-items:center;justify-content:center;
    font-size:13px;font-weight:800;
    box-shadow:0 0 0 3px #fecdd3;
  ">E</div>`,
  className:  '',
  iconSize:   [26, 26],
  iconAnchor: [13, 13],
});

// =========================
// FORMATO DE HORA [H, M]
// =========================
const fmtHM = (hm) => {
  if (!hm) return '';
  const h = hm[0] % 24;
  const m = hm[1];
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// =========================
// URLS
// =========================
const getUrlTracking = (token) =>
  `https://sg.muniguate.com/server/rest/services/digm/digm_procesiones_2026/FeatureServer/1/query?f=json&outFields=*&spatialRel=esriSpatialRelIntersects&where=(recorrido_id%3D${props.recorridoId})%20AND%20(estado%20%3D%201)&token=${token}`;

const getUrlRecorrido = (token) =>
  `https://sg.muniguate.com/server/rest/services/digm/digm_procesiones_2026/FeatureServer/2/query?spatialRel=esriSpatialRelIntersects&f=json&outFields=*&where=(recorrido_id%3D${props.recorridoId})&token=${token}`;

const getUrlPuntos = () =>
  `https://services9.arcgis.com/KpHXbQVRsuq80m4J/arcgis/rest/services/Puntos_de_Referencia/FeatureServer/0/query?where=recorrido_id=${props.recorridoId}&outFields=*&orderByFields=NO_DIGM&f=json`;

// =========================
// TRACKING
// =========================
const cargarDatos = async () => {
  try {
    const token = await obtenerToken();
    const res   = await fetch(getUrlTracking(token));
    const data  = await res.json();

    if (data.features?.length) {
      const puntos = data.features.sort(
        (a, b) => b.attributes.secuencia - a.attributes.secuencia
      );
      actual.value = puntos[0];
      const { x, y } = actual.value.geometry;

      if (!marker.value) {
        marker.value = L.marker([y, x], { icon: iconoGPS }).addTo(map.value);
      } else {
        marker.value.setLatLng([y, x]);
      }
      map.value.setView([y, x], 16);
    }
  } catch (err) {
    console.error(err);
  }
};

// =========================
// RECORRIDO
// =========================
const cargarRecorridoReal = async () => {
  try {
    const token = await obtenerToken();
    const res   = await fetch(getUrlRecorrido(token));
    const data  = await res.json();

    if (!data.features) return;

    if (layerRecorridoReal.value) {
      layerRecorridoReal.value.clearLayers();
    } else {
      layerRecorridoReal.value = L.layerGroup().addTo(map.value);
    }

    data.features.forEach(f => {
      if (!f.geometry?.paths) return;
      f.geometry.paths.forEach(path => {
        const latlngs = path.map(c => [c[1], c[0]]);
        const color   = f.attributes?.sentido_recorrido === 1 ? '#22c55e' : '#ef4444';

        const polyline = L.polyline(latlngs, {
          color, weight: 6, opacity: 0.9, lineJoin: 'round'
        }).addTo(layerRecorridoReal.value);

        L.polylineDecorator(polyline, {
          patterns: [{
            offset: 25, repeat: 100,
            symbol: L.Symbol.arrowHead({
              pixelSize: 14, polygon: true,
              pathOptions: { color, fillOpacity: 1, weight: 0 }
            })
          }]
        }).addTo(layerRecorridoReal.value);
      });
    });
  } catch (err) {
    console.error('Recorrido error:', err);
  }
};

// =========================
// PUNTOS DE REFERENCIA
// =========================
const cargarPuntos = async () => {
  try {
    const res  = await fetch(getUrlPuntos());
    const data = await res.json();

    listaPuntos.value = [];

    if (layerPuntos.value) {
      layerPuntos.value.clearLayers();
    } else {
      layerPuntos.value = L.layerGroup().addTo(map.value);
    }

    const pd = props.procesionData;

    // ── 1. SALIDA: punto independiente al inicio de la lista ──
    if (pd?.coordenadas && pd?.salida) {
      const { lat, lng } = pd.coordenadas;

      listaPuntos.value.push({
        numero:    'S',
        ubicacion: 'Salida',
        hora:      fmtHM(pd.salida),
        lat, lng,
        esSalida:  true,
      });

      L.marker([lat, lng], { icon: iconoSalida(), zIndexOffset: 200 })
        .addTo(layerPuntos.value)
        .bindPopup(`<b>Salida</b><br>${fmtHM(pd.salida)}`);
    }

    // ── 2. PUNTOS DE LA API (sin modificación) ──
    const features = (data.features ?? []).filter(p => p.geometry?.rings?.length);

    features.forEach(p => {
      const ring = p.geometry.rings[0];
      let lat = 0, lng = 0;
      ring.forEach(c => { lng += c[0]; lat += c[1]; });
      lat /= ring.length;
      lng /= ring.length;

      const numero = p.attributes.No_DIGM;

      listaPuntos.value.push({
        numero,
        ubicacion: p.attributes.ubicacion,
        hora:      p.attributes.Horario,
        lat, lng,
      });

      L.marker([lat, lng], { icon: iconoNumero(numero) })
        .addTo(layerPuntos.value)
        .bindPopup(`<b>${p.attributes.ubicacion}</b><br>Hora: ${p.attributes.Horario}`);
    });

    // ── 3. ENTRADA: punto independiente al final de la lista ──
    if (pd?.coordenadas && pd?.entrada) {
      const { lat, lng } = pd.coordenadas;

      listaPuntos.value.push({
        numero:    'E',
        ubicacion: 'Entrada',
        hora:      fmtHM(pd.entrada),
        lat, lng,
        esEntrada: true,
      });

      L.marker([lat, lng], { icon: iconoEntrada(), zIndexOffset: 200 })
        .addTo(layerPuntos.value)
        .bindPopup(`<b>Entrada</b><br>${fmtHM(pd.entrada)}`);
    }

  } catch (err) {
    console.error('Puntos error:', err);
  }
};

// =========================
// INTERACCIÓN
// =========================
const irAPunto     = (p) => map.value.setView([p.lat, p.lng], 17);
const formatearFecha = ts  => new Date(ts).toLocaleTimeString();

// =========================
// INIT
// =========================
onMounted(() => {
  map.value = L.map(mapContainer.value).setView([14.64, -90.51], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map.value);

  cargarDatos();
  cargarRecorridoReal();
  cargarPuntos();

  setInterval(cargarDatos, 60000);
});
</script>

<style scoped>
.map { height: 70vh; }

.item-salida {
  border-color: #16a34a !important;
  background: rgba(22, 163, 74, 0.08) !important;
}
.item-salida b {
  background: #15803d !important;
}

.item-entrada {
  border-color: #9f1239 !important;
  background: rgba(159, 18, 57, 0.08) !important;
}
.item-entrada b {
  background: #881337 !important;
}
</style>