<template id="home-page">
  <v-ons-page>
    <!-- Used to choose the backup file -->
    <input id="file-input" type="file" name="name"
      accept="application/zip" style="display: none;"/>

    <toolbar v-bind="toolbarInfo"></toolbar>

    <div class="flex-container">
      <div class="page-center">
        <!-- Canvas used to draw notes pages -->
        <canvas id="note-canvas" v-show="status.shapeDBLoaded"></canvas>

        <!-- Navigation buttons and pagination -->
        <v-ons-row v-show="status.shapeDBLoaded && selected">
          <!-- Previous page button -->
          <v-ons-col>
            <v-ons-icon size="2em"
              icon="ion-ios-arrow-back, material:md-arrow-left"
              class="arrow-icon"
              @click="navigatePage(false)"
            ></v-ons-icon>
          </v-ons-col>

          <!-- Pagination informations -->
          <v-ons-col class="pagination">{{ pagination }}</v-ons-col>

          <!-- Next page button -->
          <v-ons-col class="arrow-right">
            <v-ons-icon size="2em"
              icon="ion-ios-arrow-forward, material:md-arrow-right"
              class="arrow-icon"
              @click="navigatePage(true)"
            ></v-ons-icon>
          </v-ons-col>
        </v-ons-row>

        <!-- Backup selection icon -->
        <v-ons-icon size="2em"
          icon="ion-ios-document, material:md-file"
          v-show="!loading && !status.shapeDBLoaded"
          @click="openFileDialog()"
        ></v-ons-icon>

        <!-- DB loading progress bar -->
        <v-ons-progress-circular v-show="loading && !status.shapeDBLoaded"
          indeterminate></v-ons-progress-circular>
      </div>
    </div>
  </v-ons-page>
</template>

<script>
import JSZip from 'jszip';

import { mapState, mapActions } from 'vuex';

import Toolbar from './Toolbar.vue';

export default {
  name: 'Home',
  components: {
    Toolbar,
  },
  data() {
    return {
      toolbarInfo: {
        title: 'Note Viewer',
      },
      zip: null, // The backup file
      worker: null, // Worker used to load and request the databases
      pages: null, // Note pages informations
      currentPage: null, // Current page id
      pagination: '', // Pagination informations
      canvas: null, // Note drawing canvas
      width: null, // Canvas width
      height: null, // Canvas height
      ctx: null, // Drawing context
    };
  },
  computed: {
    ...mapState('loader', ['status', 'loading', 'shapeDB', 'selected']),
  },
  methods: {
    ...mapActions('loader', ['startLoading', 'zipLoaded',
      'badZipFile', 'badDatabaseFile', 'shapeDBLoaded', 'badNoteFile']),
    openFileDialog() {
      document.getElementById('file-input').click();
    },
    loadShapeDB() {
      const file = this.zip.file('ShapeDatabase.db');

      if (!file) { // Check if the note database file exists in the backup
        this.badDatabaseFile();
      } else { // Load the note database
        file.async('uint8array').then((data) => {
          this.worker.postMessage({
            id: 'openShapeDB',
            action: 'open',
            buffer: data,
          });
        });
      }
    },
    parseShapeDB(lines) {
      const notesIndex = [];

      // Fill the notes index
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line[25] === 0) { // Removes the book annotations
          const note = {
            id: line[3],
            folder: line[8] === 0,
            createdAt: new Date(line[1]),
            updatedAt: new Date(line[2]),
            title: line[6],
          };

          if (!note.folder) {
            // line[4] is the parent id
            [, , , , note.parent] = line;
          }

          // Remove the deleted notes
          if (note.folder || line[26] !== 0) {
            notesIndex.push(note);
          }
        }
      }

      this.shapeDBLoaded(notesIndex);
    },
    loadNote(id) {
      const file = this.zip.file(`${id}.db`);

      if (!file) { // Check if the note file exists in the backup
        this.badNoteFile();
      } else { // Load the note
        file.async('uint8array').then((data) => {
          this.worker.postMessage({
            id: 'openNote',
            action: 'open',
            buffer: data,
          });
        });
      }
    },
    parseShapeModel(lines) {
      const pages = {};

      // Fill the pages with the points informations
      for (let i = 0; i < lines.length; i++) {
        const pageId = lines[i][5];

        if (!pages[pageId]) { // Create the page if it doesn't exists
          pages[pageId] = {};
          pages[pageId].lines = [];
        }

        // Push the points data for the page
        pages[pageId].lines.push(lines[i][13]);
      }

      this.pages = pages;

      // Update the current page and pagination
      const keys = Object.keys(pages);
      [this.currentPage] = keys;
      this.pagination = `1/${keys.length}`;

      // Draw the first page
      const page = this.pages[this.currentPage];
      this.drawPage(page);
    },
    navigatePage(forward) {
      const keys = Object.keys(this.pages);
      let index = keys.indexOf(this.currentPage);

      // Update the page index
      index = forward ? index + 1 : index - 1;

      // Limit the index in the keys range
      index = index < 0 ? keys.length - 1 : index;
      index = index === keys.length ? 0 : index;

      // Update the current page and pagination
      this.currentPage = keys[index];
      this.pagination = `${index + 1}/${keys.length}`;

      // Draw the current page
      const page = this.pages[this.currentPage];
      this.drawPage(page);
    },
    // Used to get point informations at a given offset
    getValues(dataView, offset) {
      const values = {};

      values.x = dataView.getFloat32(offset); // X
      values.y = dataView.getFloat32(offset + 4); // Y
      values.pressure = dataView.getFloat32(offset + 8); // Pressure
      values.size = dataView.getFloat32(offset + 12); // Size
      values.timestamp = Number(dataView.getBigInt64(offset + 16)); // Timestamp

      return values;
    },
    drawPage(page) {
      // Clear the canvas
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < page.lines.length; i++) {
        const lineData = page.lines[i];
        const dataView = new DataView(lineData.buffer);
        const points = lineData.length / 24; // The number of points to read

        // Process the points
        for (let j = 0; j < points; j++) {
          // Read the point informations
          const vals = this.getValues(dataView, j * 24);

          // Draw the point
          this.ctx.beginPath();
          this.ctx.arc(this.width * vals.x, this.height * vals.y, 1, 0, 2 * Math.PI, true);
          this.ctx.stroke();
        }
      }
    },
  },
  async created() {
    // Create a worker to load and request the databases
    this.worker = new Worker('/worker.sql-wasm.js');

    // Process the worker messages
    this.worker.onmessage = (event) => {
      const { data } = event;

      switch (data.id) {
        case 'openShapeDB': { // The global notes database has been opened
          this.worker.postMessage({
            id: 'loadShapeDB',
            action: 'exec',
            sql: 'SELECT * FROM NoteModel',
          });
          break;
        }
        case 'loadShapeDB': { // The global notes database has been read
          const lines = data.results[0].values;
          this.parseShapeDB(lines);
          break;
        }
        case 'openNote': { // A note database has been opened
          this.worker.postMessage({
            id: 'loadShapeModel',
            action: 'exec',
            sql: 'SELECT * FROM NewShapeModel',
          });
          break;
        }
        case 'loadShapeModel': { // A note database has been read
          const lines = data.results[0].values;
          this.parseShapeModel(lines);
          break;
        }
        default: {
          break;
        }
      }
    };
  },
  mounted() {
    // Set up file chooser
    const chooser = document.getElementById('file-input');
    chooser.addEventListener('change', () => {
      this.startLoading();
      const file = chooser.files[0];
      JSZip.loadAsync(file).then((zip) => {
        this.zip = zip;
        this.zipLoaded();
      }, () => { // The file selected wasn't a valid zip file
        this.badZipFile();
      });
    });

    // Set up canvas and draw context
    this.canvas = document.getElementById('note-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Compute the aspect ratio and update canvas width and height
    const width = window.innerWidth;
    const height = width * (4 / 3); // 4/3 aspect ratio of the Onyx Boox Note
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  },
  watch: {
    status(status) {
      // Load the shape DB when the zip file is loaded
      if (status.zipLoaded) {
        this.loadShapeDB();
      }
    },
    selected(id) {
      // Load the choosed note
      this.loadNote(id);
    },
  },
};
</script>

<style scoped>
.flex-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
}

.page-center {
  order: 0;
  flex: 1 1 auto;
  align-self: auto;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.arrow-icon {
  margin: 0 10px;
}

.arrow-right {
  text-align: right;
}

.pagination {
  display: flex;
  justify-content: center;
  align-self: center;
}

canvas {
  width: 100%;
}
</style>
