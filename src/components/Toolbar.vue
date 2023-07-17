<template>
  <v-ons-toolbar>
    <div class="left">
      <v-ons-toolbar-button @click="$store.commit('splitter/toggle')">
        <v-ons-icon icon="ion-ios-menu, material:md-menu"></v-ons-icon>
      </v-ons-toolbar-button>
    </div>
    <div class="center">
      {{ title }}
    </div>
  </v-ons-toolbar>
</template>

<script>
export default {
  name: 'ToolbarComponent',
  props: ['title'],
};
</script>
