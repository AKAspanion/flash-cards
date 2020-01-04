import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    snackBar: {
      model: false,
      text: '',
    },
    user: {
      uid: '',
      userSince: '',
      displayName: '',
      photoURL: '',
      email: '',
    },
    loading: false,
    isBarNav: false,
    isLoggedIn: false,
    landingVisited: false,
  },
  mutations: {
    setSnackBar(state, payload) {
      state.snackBar = payload;
    },
    setLoading(state, payload) {
      state.loading = payload;
    },
    setUser(state, payload) {
      state.user = payload;
    },
    setLogin(state, payload) {
      state.isLoggedIn = payload;
    },
    setBarNav(state, payload) {
      state.isBarNav = payload;
    },
  },
  actions: {
    RESET_STORE({ commit }) {
      commit('setTasks', []);
      commit('landingVisited', false);
      commit('setUser', {
        uid: '',
        displayName: '',
        photoURL: '',
        email: '',
      });
      commit('setLogin', false);
      localStorage.setItem('isLoggedIn', JSON.stringify(false));
    },
    SET_USER({ commit }, payload) {
      const { uid, displayName, photoURL, email } = payload;
      commit('setUser', {
        uid,
        email,
        photoURL,
        displayName,
        userSince: payload.metadata.creationTime,
      });
    },
    UNSET_USER({ commit }) {
      commit('setUser', {
        uid: '',
        userSince: '',
        displayName: '',
        photoURL: '',
        email: '',
      });
    },
    LOGIN({ commit }) {
      commit('setLogin', true);
      localStorage.setItem('isLoggedIn', JSON.stringify(true));
    },
    LOGOUT({ commit }) {
      commit('setLogin', false);
      localStorage.setItem('isLoggedIn', JSON.stringify(false));
    },
    LANDING_VISITED({ commit }, payload) {
      commit('landingVisited', payload);
    },
    SHOW_SNACK({ commit }, payload) {
      commit('setSnackBar', {
        model: true,
        text: payload,
      });
    },
    SHOW_NAVBAR({ commit }, payload) {
      commit('setBarNav', payload);
    },
    LOADING({ commit }, payload) {
      commit('setLoading', payload);
    },
  },
  getters: {
    loading(state) {
      return state.loading;
    },
    barNav(state) {
      return state.isBarNav;
    },
    user(state) {
      return state.user;
    },
    loggedIn(state) {
      return state.isLoggedIn;
    },
  },
});
