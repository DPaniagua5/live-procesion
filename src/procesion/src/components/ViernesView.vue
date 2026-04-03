<template>
  <div>
    <!-- TÍTULO: nombre completo de la procesión seleccionada -->
    <div v-if="seleccionado !== 'todas'" class="titulo">
      <h1>{{ procesionActual?.nombreCompleto }}</h1>
    </div>

    <!-- SELECTOR BAR -->
    <div class="selector-bar">
      <!-- Toggle filtro activas -->
      <button
        :class="['btn-filtro', { activo: soloActivas }]"
        @click="soloActivas = !soloActivas"
        title="Mostrar solo procesiones en recorrido ahora"
      >
        <span class="filtro-dot"></span>
        {{ soloActivas ? 'Activas' : 'Todas' }}
      </button>

      <div class="selector-label">Procesión</div>

      <div class="selector-wrapper">
        <select v-model="seleccionado" class="selector-procesion">
          <option value="todas">TODAS</option>

          <!-- Modo filtrado: agrupa en activas / fuera de horario -->
          <template v-if="soloActivas">
            <optgroup v-if="procesionesActivas.length" label="● En recorrido ahora">
              <option
                v-for="proc in procesionesActivas"
                :key="proc.id"
                :value="String(proc.id)"
              >{{ proc.nombre }}</option>
            </optgroup>
            <optgroup v-if="procesionesInactivas.length" label="○ Fuera de horario">
              <option
                v-for="proc in procesionesInactivas"
                :key="proc.id"
                :value="String(proc.id)"
              >{{ proc.nombre }}</option>
            </optgroup>
          </template>

          <!-- Modo normal: lista completa con indicador -->
          <template v-else>
            <option
              v-for="proc in procesiones"
              :key="proc.id"
              :value="String(proc.id)"
            >{{ estaActiva(proc) ? '●' : '○' }} {{ proc.nombre }}</option>
          </template>
        </select>
        <span class="selector-arrow">▾</span>
      </div>

      <!-- Contador procesiones activas -->
      <div class="contador-activas" :class="{ hay: procesionesActivas.length > 0 }">
        {{ procesionesActivas.length }}<span class="contador-total">/{{ procesiones.length }}</span>
        <span class="contador-label">activas</span>
      </div>
    </div>

    <!-- VISTA TODAS -->
    <MapaTodas v-if="seleccionado === 'todas'" />

    <!-- VISTA INDIVIDUAL: se pasa la procesión completa para mostrar horarios en mapa -->
    <MapaProcesion
      v-else
      :key="`mapa-${seleccionado}`"
      :recorridoId="Number(seleccionado)"
      :procesionData="procesionActual"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import MapaProcesion from './MapaProcesion.vue';
import MapaTodas from './MapaTodas.vue';
import { PROCESIONES, COLORES_PROCESION, estaActiva } from '../data/procesiones';

const procesiones  = PROCESIONES;
const seleccionado = ref('todas');
const soloActivas  = ref(false);

const procesionActual = computed(() =>
  procesiones.find(p => String(p.id) === seleccionado.value) ?? null
);

const colorActual = computed(() => {
  const idx = procesiones.findIndex(p => String(p.id) === seleccionado.value);
  return idx >= 0 ? COLORES_PROCESION[idx] : 'transparent';
});

const procesionesActivas   = computed(() => procesiones.filter(p =>  estaActiva(p)));
const procesionesInactivas = computed(() => procesiones.filter(p => !estaActiva(p)));
</script>

<style scoped>
/* ─── TÍTULO ─── */
.titulo {
  background: var(--card);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
}

.titulo h1 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

/* ─── SELECTOR BAR ─── */
.selector-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}

.selector-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-light);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ─── BOTÓN FILTRO ─── */
.btn-filtro {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.filtro-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-light);
  transition: all 0.2s;
}

.btn-filtro.activo {
  border-color: #16a34a;
  color: #4ade80;
  background: rgba(22, 163, 74, 0.12);
}

.btn-filtro.activo .filtro-dot {
  background: #4ade80;
  box-shadow: 0 0 6px #4ade80;
}

/* ─── SELECT ─── */
.selector-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.selector-procesion {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 7px 32px 7px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  text-overflow: ellipsis;
}

.selector-procesion:focus,
.selector-procesion:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(94, 9, 130, 0.2);
}

.selector-procesion option,
.selector-procesion optgroup {
  background: var(--card);
  color: var(--text);
}

.selector-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-light);
  font-size: 12px;
}

/* ─── CONTADOR ─── */
.contador-activas {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-light);
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.3s;
}

.contador-activas.hay {
  color: #4ade80;
}

.contador-total {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-light);
}

.contador-label {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-light);
  margin-left: 2px;
}
</style>