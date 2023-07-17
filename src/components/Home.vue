<template id="home-page">
  <v-ons-page>
    <!-- Used to choose the backup file -->
    <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
    <input id="file-input" type="file" name="name"
      accept="application/zip" style="display: none;" label=""/>

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
  name: 'HomeView',
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
    parseShapeModel(data) {
      // Get the indexes of the interesting values
      const pageIdIndex = data.columns.indexOf('pageUniqueId');
      const colorIndex = data.columns.indexOf('color');
      const thicknessIndex = data.columns.indexOf('thickness');
      const pointsIndex = data.columns.indexOf('points');
      const typeIndex = data.columns.indexOf('shapeType');

      // Get the values
      const lines = data.values;
      // Create an object to store the pages
      const pages = {};

      // Fill the pages with the points informations
      for (let i = 0; i < lines.length; i++) {
        const pageId = lines[i][pageIdIndex];

        if (!pages[pageId]) { // Create the page if it doesn't exists
          pages[pageId] = {};
          pages[pageId].shapes = [];
        }

        // Convert the color to hex and keep only the RGB part
        const color = (lines[i][colorIndex] >>> 0).toString(16).substring(2);

        // Push the color, thickness, type and points list of each shape for the corresponding page
        pages[pageId].shapes.push({
          color,
          thickness: lines[i][thicknessIndex],
          points: lines[i][pointsIndex],
          type: lines[i][typeIndex],
        });
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

      for (let i = 0; i < page.shapes.length; i++) {
        const shapeData = page.shapes[i];
        const dataView = new DataView(shapeData.points.buffer);

        // Set the shape color
        this.ctx.strokeStyle = `#${shapeData.color}`;
        // Set the shape thickness
        this.ctx.lineWidth = shapeData.thickness;

        // If the shape is a circle, a rectangle, a line or a triangle
        if ([0, 1, 7, 8].indexOf(shapeData.type) !== -1) {
          const p1 = this.getValues(dataView, 0);
          const p2 = this.getValues(dataView, 24);
          const projectedP1 = {
            x: this.width * p1.x,
            y: this.height * p1.y,
          };
          const projectedP2 = {
            x: this.width * p2.x,
            y: this.height * p2.y,
          };

          switch (shapeData.type) {
            case 0: { // Circles and ellipses
              const width = projectedP2.x - projectedP1.x;
              const height = projectedP2.y - projectedP1.y;
              const center = {
                x: projectedP2.x - (width / 2),
                y: projectedP2.y - (height / 2),
              };
              const radiusX = Math.abs(width / 2);
              const radiusY = Math.abs(height / 2);

              this.ctx.beginPath();
              this.ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
              this.ctx.stroke();
              break;
            }
            case 1: { // Rectangle
              const width = projectedP2.x - projectedP1.x;
              const height = projectedP2.y - projectedP1.y;

              this.ctx.strokeRect(projectedP1.x, projectedP1.y, width, height);
              break;
            }
            case 7: { // Line
              this.ctx.beginPath();
              this.ctx.moveTo(projectedP1.x, projectedP1.y);
              this.ctx.lineTo(projectedP2.x, projectedP2.y);
              this.ctx.stroke();
              break;
            }
            case 8: { // Triangle
              const halfWidth = projectedP1.x - projectedP2.x;
              const projectedP3 = {
                x: projectedP2.x + halfWidth * 2,
                y: projectedP2.y,
              };

              this.ctx.beginPath();
              this.ctx.moveTo(projectedP1.x, projectedP1.y);
              this.ctx.lineTo(projectedP2.x, projectedP2.y);
              this.ctx.lineTo(projectedP3.x, projectedP3.y);
              this.ctx.closePath();
              this.ctx.stroke();
              break;
            }
            default: {
              break;
            }
          }
        } else { // The shape is a stroke
          const points = shapeData.points.length / 24; // The number of points to read

          // Process the points
          this.ctx.beginPath();
          for (let j = 0; j < points; j++) {
            // Read the point informations
            const vals = this.getValues(dataView, j * 24);

            // Draw the point
            if (j === 0) {
              this.ctx.moveTo(this.width * vals.x, this.height * vals.y);
            } else {
              this.ctx.lineTo(this.width * vals.x, this.height * vals.y);
            }
          }
          this.ctx.stroke();
        }
      }
    },
  },
  async created() {
    // Create a worker to load and request the databases
    this.worker = new Worker(`${process.env.BASE_URL}worker.sql-wasm.js`);

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
          this.parseShapeModel(data.results[0]);
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
