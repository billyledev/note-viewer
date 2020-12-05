import Vue from 'vue';
import Vuex from 'vuex';

import alert from './alert.module';
import splitter from './splitter.module';
import loader from './loader.module';

Vue.use(Vuex);

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  namespaced: true,
  state: {
  },
  getters: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    alert,
    splitter,
    loader,
  },
});
