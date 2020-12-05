import 'onsenui/css/onsenui.css';
import 'onsenui/css/onsen-css-components.css';

import Vue from 'vue';
import VueOnsen from 'vue-onsenui';
import App from './App.vue';
import store from './_store';

Vue.use(VueOnsen);

Vue.config.productionTip = false;

new Vue({
  store,
  render: (h) => h(App),
  beforeCreate() {
    // Shortcut for Material Design
    Vue.prototype.md = this.$ons.platform.isAndroid();
  },
}).$mount('#app');
