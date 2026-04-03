<template>
  <MenuHamburguesa @cambiar="irA" />
  <component :is="vistaActual" />
</template>

<script setup>
import { shallowRef  } from 'vue';
import HoyView from './components/JuevesView.vue';
import MananaView from './components/ViernesView.vue';
import MenuHamburguesa from './components/MenuHamburguesa.vue';

const vistaActual = shallowRef(HoyView);

const irA = (dia) => {
  vistaActual.value = dia === 'hoy' ? HoyView : MananaView;
};
</script>