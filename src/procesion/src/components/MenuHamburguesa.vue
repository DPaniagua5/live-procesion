<!-- <template>
  <div>
    <button @click="$emit('cambiar', 'hoy')">Jueves</button>
    <button @click="$emit('cambiar', 'manana')">Viernes</button>
  </div> -->
  <template>
  <div class="tabs">
  <button 
    :class="['tab', { active }]" 
    @click="$emit('cambiar', 'hoy', 'active')"
  >
    Jueves
  </button>

  <button 
    :class="['tab', { active: vista === 'viernes' }]" 
    @click="$emit('cambiar', 'manana')"
  >
    Viernes
  </button>
</div>
<!-- </template>     -->

</template>
