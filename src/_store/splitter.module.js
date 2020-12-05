const state = {
  open: false,
};

const getters = {};

const mutations = {
  toggle(state, shouldOpen) {
    if (typeof shouldOpen === 'boolean') {
      state.open = shouldOpen;
    } else {
      state.open = !state.open;
    }
  },
};

const actions = {};

const modules = {};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
  modules,
};
