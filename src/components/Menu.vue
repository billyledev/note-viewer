<template>
  <v-ons-page>
    <v-ons-list>
      <!-- Root notes -->
      <div v-if="rootNotes.length">
        <ons-list-header>Root</ons-list-header>
        <ons-list-item v-for="item in rootNotes"
          :key="item.id" modifier="chevron" tappable
          @click="selectNote(item.id)"
        >
          {{ item.title }}
        </ons-list-item>
      </div>
      <!-- Remaining folders and notes -->
      <template v-for="item in notesItems">
        <!-- Folder names -->
        <ons-list-header v-if="item.folder" :key="item.id">
          {{ item.title }}
        </ons-list-header>
        <!-- Notes names -->
        <ons-list-item v-else :key="item.id"
          modifier="chevron" tappable
          @click="selectNote(item.id)"
        >
          {{ item.title }}
        </ons-list-item>
      </template>
    </v-ons-list>
  </v-ons-page>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'Menu',
  computed: {
    ...mapGetters('loader', ['notesItems', 'rootNotes']),
  },
  methods: {
    ...mapActions('loader', ['selectNote']),
  },
};
</script>
