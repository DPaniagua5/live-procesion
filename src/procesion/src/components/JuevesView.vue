<template>
  <MapaProcesion
    :recorridoId="202208"
    :procesionData="procesionJueves"
  />
</template>

<script setup>
import MapaProcesion from '../components/MapaProcesion.vue';

const procesionJueves = {
  salida:      [6, 0],
  entrada:     [25, 30],
  coordenadas: { lat: 14.647850096134201, lng: -90.50290545587161 }
};
</script>