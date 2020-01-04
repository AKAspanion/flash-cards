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
    isLoggedIn: false,
    landingVisited: false,
    flashCardSets: [],
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
    setFlashCardSets(state, payload) {
      state.flashCardSets = payload;
    },
    landingVisited(state, payload) {
      state.landingVisited = payload;
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
    LOADING({ commit }, payload) {
      commit('setLoading', payload);
    },
    SET_FLASH_CARDS({ commit }, payload) {
      commit('setFlashCardSets', payload);
    },
  },
  getters: {
    loading(state) {
      return state.loading;
    },
    user(state) {
      return state.user;
    },
    snackBar(state) {
      return state.snackBar;
    },
    loggedIn(state) {
      return state.isLoggedIn;
    },
    flashCardSets(state) {
      return state.flashCardSets;
    },
    landingVisited(state) {
      return state.landingVisited;
    },
  },
});
