<template>
  <v-ons-splitter>
    <v-ons-splitter-side
      swipeable side="left" collapse="" width="80%"
      :animation="md ? 'overlay' : 'reveal'"
      :swipe-target-width="md && 25" :open.sync="isOpen"
    >
      <Menu/>
    </v-ons-splitter-side>
    <v-ons-splitter-content>
      <Home/>
    </v-ons-splitter-content>
  </v-ons-splitter>
</template>

<script>
import Menu from './components/Menu.vue';
import Home from './components/Home.vue';

export default {
  name: 'AppSplitter',
  components: {
    Menu,
    Home,
  },
  computed: {
    isOpen: {
      get() {
        return this.$store.state.splitter.open;
      },
      set(newValue) {
        this.$store.commit('splitter/toggle', newValue);
      },
    },
  },
};
</script>
