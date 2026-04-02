<template>
  <div id="app">
    <div class="header">
      <h1>GPS Procesiones 2026</h1>

      <div v-if="actual" class="info">
        <p><strong>Secuencia:</strong> {{ actual.attributes.secuencia }}</p>
        <p><strong>Velocidad:</strong> {{ actual.attributes.esrignss_speed || 0 }} km/h</p>
        <p><strong>Último reporte:</strong> {{ formatearFecha(actual.attributes.esrignss_fixdatetime) }}</p>
      </div>

      <button @click="cargarDatos">Actualizar</button>
    </div>

    <div id="map"></div>

    <!-- LISTA DE PUNTOS -->
    <div class="info-recorrido">
      <h3>Puntos de referencia</h3>
      <ul>
        <li 
          v-for="p in puntos" 
          :key="p.id"
          @click="irAPunto(p)"
        >
          <b>{{ p.numero }}.</b> {{ p.ubicacion }} - {{ p.horario }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = ref(null);
const marker = ref(null);
const actual = ref(null);

const puntos = ref([]);

// capas
const layerRecorridoReal = ref(null);
const layerPuntos = ref(null);

// =========================
// TRACKING
// =========================',
const cargarDatos = async () => {
  const url = `https://sg.muniguate.com/server/rest/services/digm/digm_procesiones_2026/FeatureServer/1/query?f=json&outFields=*&spatialRel=esriSpatialRelIntersects&where=(recorrido_id%3D202208)%20AND%20(estado%20%3D%201)&token=pblcN4l9gJ636A_LZaGl93GVYw7Qe2ZNFzmWahV4LLe4GvMs37svweTDsCjVu1dS44CnUj6GuhdM3m8aNivph8v52x5YUcXFNutJCT4rmM84AaFUpF4d3gfjuC7xrwIE`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.features?.length) {
      const puntosOrdenados = data.features.sort(
        (a, b) => b.attributes.secuencia - a.attributes.secuencia
      );

      actual.value = puntosOrdenados[0];
      const { x, y } = actual.value.geometry;

      const icono = L.icon({
        iconUrl: 'https://gis.muniguate.com/procesiones/assets/icons/puntos_interes/2025/GPS2025.png',
        iconSize: [35, 35]
      });

      if (!marker.value) {
        marker.value = L.marker([y, x], { icon: icono }).addTo(map.value);
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
// RECORRIDO REAL
// =========================
const cargarRecorridoReal = async () => {
  const url = `https://sg.muniguate.com/server/rest/services/digm/digm_procesiones_2026/FeatureServer/2/query?spatialRel=esriSpatialRelIntersects&f=json&outFields=*&where=(recorrido_id%3D202208)&token=pblcN4l9gJ636A_LZaGl96xg-p-h1CQSxdivhKu7bDYIRBlysiwUk2XlrGtBye6Jmim7GNW-_Of3DX7HMrJJOFWA5vlgVjupPYjPjVZLqlHNMvYnnMJCGpNbJ2W3YdLh`;

  try {
    const res = await fetch(url);
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
          ? 'green'
          : 'red';

        L.polyline(latlngs, {
          color,
          weight: 5
        }).addTo(layerRecorridoReal.value);
      });
    });

  } catch (err) {
    console.error("Error recorrido:", err);
  }
};

// =========================
// PUNTOS
// =========================
const iconoNumero = (numero) => L.divIcon({
  className: 'icono-numero',
  html: `<div>${numero}</div>`,
  iconSize: [30, 30]
});

const cargarPuntos = async () => {
  const url = `https://services9.arcgis.com/KpHXbQVRsuq80m4J/arcgis/rest/services/Puntos_de_Referencia/FeatureServer/0/query?where=recorrido_id=202208&outFields=*&orderByFields=NO_DIGM&f=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features || !Array.isArray(data.features)) return;

    if (layerPuntos.value) {
      layerPuntos.value.clearLayers();
    } else {
      layerPuntos.value = L.layerGroup().addTo(map.value);
    }

    puntos.value = [];

    data.features.forEach(p => {
      const ring = p.geometry.rings[0];

      let lat = 0, lng = 0;
      ring.forEach(c => {
        lng += c[0];
        lat += c[1];
      });

      lat /= ring.length;
      lng /= ring.length;

      const attrs = p.attributes;

      // 🔵 círculo
      L.circleMarker([lat, lng], {
        radius: 6,
        color: 'blue'
      }).addTo(layerPuntos.value);

      // 🔢 número
      L.marker([lat, lng], {
        icon: iconoNumero(attrs.No_DIGM)
      }).addTo(layerPuntos.value);

      // 📋 lista
      puntos.value.push({
        id: attrs.OBJECTID,
        numero: attrs.No_DIGM,
        ubicacion: attrs.ubicacion,
        horario: attrs.Horario,
        lat,
        lng
      });
    });

  } catch (err) {
    console.error(err);
  }
};

// =========================
// CLICK LISTA → MAPA
const irAPunto = (p) => {
  map.value.setView([p.lat, p.lng], 16);
};

// =========================
const formatearFecha = ts => new Date(ts).toLocaleTimeString();

// =========================
// INIT
onMounted(() => {
  map.value = L.map('map').setView([14.64, -90.51], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map.value);

  cargarDatos();
  cargarRecorridoReal();
  cargarPuntos();

  setInterval(cargarDatos, 60000);
});
</script>

<style>
body { margin: 0; font-family: sans-serif; }

#map { height: 70vh; }

.header {
  padding: 20px;
  background: #2c3e50;
  color: white;
  text-align: center;
}

.info {
  display: flex;
  justify-content: center;
  gap: 20px;
}

button {
  padding: 10px;
  background: orange;
  border: none;
}

.info-recorrido {
  padding: 15px;
  background: #f5f5f5;
}

.info-recorrido ul {
  list-style: none;
  padding: 0;
}

.info-recorrido li {
  padding: 5px;
  cursor: pointer;
}

.info-recorrido li:hover {
  background: #ddd;
}

.icono-numero div {
  background: purple;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
</style>