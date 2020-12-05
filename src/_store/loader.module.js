const state = {
  status: {},
  loading: false,
  shapeDB: [],
  selected: '',
};

const getters = {
  // Returns the folders and notes ordered by folder
  notesItems: (state, getters) => {
    const { folders } = getters;
    let items = [];

    for (let i = 0; i < folders.length; i++) {
      // Clone folder
      const folder = { ...folders[i] };
      items.push(folder);

      // Clone child notes
      let childNotes = state.shapeDB.filter((item) => item.parent === folder.id);
      childNotes = JSON.parse(JSON.stringify(childNotes));
      items = items.concat(childNotes);
    }

    return items;
  },
  // Returns the folders
  folders: (state) => state.shapeDB.filter((item) => item.folder),
  // Returns the root folder notes (notes without parent folder)
  rootNotes: (state) => state.shapeDB.filter((item) => item.parent === null),
};

const mutations = {
  startLoading(state) {
    state.loading = true;
  },
  zipLoaded(state) {
    state.status = {};
    state.status.zipLoaded = true;
  },
  badZipFile(state) {
    state.status = {};
    state.loading = false;
  },
  badDatabaseFile(state) {
    state.status = {};
    state.loading = false;
  },
  shapeDBLoaded(state, shapeDB) {
    state.status = {};
    state.status.shapeDBLoaded = true;
    state.loading = false;
    state.shapeDB = shapeDB;
  },
  selectNote(state, id) {
    state.selected = id;
    state.loading = true;
  },
};

const actions = {
  startLoading({ commit }) {
    commit('startLoading');
  },
  zipLoaded({ commit }) {
    commit('zipLoaded');
  },
  badZipFile({ commit, dispatch }) {
    dispatch('alert/pushToast', {
      message: 'Error while loading backup file!',
    }, { root: true });
    commit('badZipFile');
  },
  badDatabaseFile({ commit, dispatch }) {
    dispatch('alert/pushToast', {
      message: 'Error while loading notes database!',
    }, { root: true });
    commit('badDatabaseFile');
  },
  shapeDBLoaded({ commit }, shapeDB) {
    commit('shapeDBLoaded', shapeDB);
  },
  selectNote({ commit }, id) {
    commit('splitter/toggle', {}, { root: true });
    commit('selectNote', id);
  },
  badNoteFile({ dispatch }) {
    dispatch('alert/pushToast', {
      message: 'Error while loading this note data!',
    }, { root: true });
  },
};

const modules = {};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
  modules,
};
