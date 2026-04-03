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
        v-for="p in listaPuntos" 
        :key="p.numero" 
        class="item"
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
import 'leaflet-polylinedecorator'
import { obtenerToken } from '../functions/token';

// =========================
// PROPS
// =========================
const props = defineProps({
  recorridoId: Number,
  token: String
});

// =========================
// ESTADO
// =========================
const map = ref(null);
const mapContainer = ref(null);
const marker = ref(null);
const actual = ref(null);

const layerRecorridoReal = ref(null);
const layerPuntos = ref(null);

const listaPuntos = ref([]);

// =========================
// ICONO GPS
// =========================
const iconoGPS = L.icon({
  iconUrl: 'https://gis.muniguate.com/procesiones/assets/icons/puntos_interes/2025/GPS2025.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

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

    const res = await fetch(getUrlTracking(token));
    const data = await res.json();

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
    const res = await fetch(getUrlRecorrido(token));
    const data = await res.json();

    if (!data.features) return;

    if (layerRecorridoReal.value) {
      layerRecorridoReal.value.clearLayers();
    } else {
      layerRecorridoReal.value = L.layerGroup().addTo(map.value);
    }

    data.features.forEach(f => {
      if (!f.geometry || !f.geometry.paths) return;

      f.geometry.paths.forEach(path => {
        const latlngs = path.map(c => [c[1], c[0]]);

        const color = f.attributes?.sentido_recorrido === 1
          ? '#22c55e' 
          : '#ef4444';

        //Línea
        const polyline = L.polyline(latlngs, {
          color,
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(layerRecorridoReal.value);

        //Flechas
        const decorator = L.polylineDecorator(polyline, {
          patterns: [
            {
              offset: 25,
              repeat: 100,
              symbol: L.Symbol.arrowHead({
                pixelSize: 14,
                polygon: true,
                pathOptions: {
                  color: color,
                  fillOpacity: 1,
                  weight: 0
                }
              })
            }
          ]
        });

        decorator.addTo(layerRecorridoReal.value);
      });
    });

  } catch (err) {
    console.error("Recorrido error:", err);
  }
};

// =========================
// PUNTOS
// =========================
const cargarPuntos = async () => {
  try {
    const res = await fetch(getUrlPuntos());
    const data = await res.json();

    listaPuntos.value = [];

    if (layerPuntos.value) {
      layerPuntos.value.clearLayers();
    } else {
      layerPuntos.value = L.layerGroup().addTo(map.value);
    }

    data.features.forEach(p => {
      if (!p.geometry?.rings?.length) return;

      const ring = p.geometry.rings[0];

      let lat = 0, lng = 0;
      ring.forEach(c => {
        lng += c[0];
        lat += c[1];
      });

      lat /= ring.length;
      lng /= ring.length;

      const numero = p.attributes.No_DIGM;

      // guardar para lista
      listaPuntos.value.push({
        ubicacion: p.attributes.ubicacion,
        hora: p.attributes.Horario,
        numero,
        lat,
        lng
      });

      // marcador con número
      const iconoNumero = L.divIcon({
        html: `<div style="
          background: #5E0982;
          color: white;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        ">${numero}</div>`,
        className: ''
      });

      L.marker([lat, lng], { icon: iconoNumero })
        .addTo(layerPuntos.value)
        .bindPopup(`
          <b>${p.attributes.ubicacion}</b><br>
          Hora: ${p.attributes.Horario}
        `);
    });

  } catch (err) {
    console.error("Puntos error:", err);
  }
};

// =========================
// INTERACCIÓN
// =========================
const irAPunto = (p) => {
  map.value.setView([p.lat, p.lng], 17);
};

const formatearFecha = ts => new Date(ts).toLocaleTimeString();

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
.map {
  height: 70vh;
}
</style>