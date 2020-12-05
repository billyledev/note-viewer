<template>
  <div id="app">
    <app-splitter></app-splitter>
    <v-ons-toast :visible.sync="visible">
      {{ visible ? active.message : '' }}
    </v-ons-toast>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

import AppSplitter from './AppSplitter.vue';

export default {
  name: 'App',
  components: {
    AppSplitter,
  },
  computed: {
    ...mapGetters('alert', ['visible']),
    ...mapState('alert', ['active']),
  },
};
</script>
