import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    snackBtnCLick: false,
    snackBar: {
      model: false,
      text: '',
      btn: '',
    },
    user: {
      uid: '',
      creationTime: '',
      lastSignInTime: '',
      displayName: '',
      photoURL: '',
      email: '',
    },
    labels: [],
    loading: false,
    isLoggedIn: false,
    landingVisited: false,
    flashCardSets: [],
    snackInterval: 0,
    isOnline: true,
  },
  mutations: {
    setSnackBtnCLick(state, payload) {
      state.snackBtnCLick = payload;
    },
    setSnackBar(state, payload) {
      state.snackBar = payload;
    },
    setOnline(state, payload) {
      state.isOnline = payload;
    },
    setLoading(state, payload) {
      clearInterval(state.snackInterval);
      if (payload) {
        state.snackInterval = setInterval(() => {
          state.snackBar = {
            model: true,
            text: 'Experiencing network difficulty, please hold on!',
            btn: '',
          };
        }, 6000);
      } else {
        clearInterval(state.snackInterval);
        state.snackInterval = 0;
      }
      state.loading = payload;
    },
    setUser(state, payload) {
      state.user = payload;
    },
    setLogin(state, payload) {
      state.isLoggedIn = payload;
    },
    landingVisited(state, payload) {
      state.landingVisited = payload;
    },
    setLabels(state, payload) {
      state.labels = payload;
    },
    addLabel(state, payload) {
      const newLabels: any = [...state.labels, payload];
      state.labels = newLabels;
    },
    updateLabel(state, payload) {
      const index = state.labels.findIndex((e: any) => e.docId === payload.docId);
      const newLabels: any = [...state.labels];
      newLabels[index] = payload;
      state.labels = newLabels;
    },
    setFlashCardSets(state, payload) {
      state.flashCardSets = payload;
    },
    addFlashCardSet(state, payload) {
      const newSets: any = [...state.flashCardSets, payload];
      state.flashCardSets = newSets;
    },
    updateFlashCardSet(state, payload) {
      const index = state.flashCardSets.findIndex((e: any) => e.id === payload.id);
      const newSets: any = [...state.flashCardSets];
      newSets[index] = payload;
      state.flashCardSets = newSets;
    },
    deleteFlashCardSet(state, payload) {
      state.flashCardSets = [...state.flashCardSets.filter((c: any) => c.docId !== payload.docId)];
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
      const { uid, displayName, photoURL, email, metadata } = payload;
      const { creationTime, lastSignInTime } = metadata;
      commit('setUser', {
        uid,
        email,
        photoURL,
        displayName,
        creationTime,
        lastSignInTime,
      });
    },
    SET_LOCAL_USER({ commit }, payload) {
      const { uid, displayName, photoURL, email, creationTime, lastSignInTime } = payload;
      commit('setUser', {
        uid,
        email,
        photoURL,
        displayName,
        creationTime,
        lastSignInTime,
      });
    },
    UNSET_USER({ commit }) {
      commit('setUser', {
        uid: '',
        creationTime: '',
        lastSignInTime: '',
        displayName: '',
        photoURL: '',
        email: '',
      });
    },
    ONLINE({ commit }, payload) {
      commit('setOnline', payload);
    },
    LOGIN({ commit }) {
      commit('setLogin', true);
      localStorage.setItem('isLoggedIn', JSON.stringify(true));
    },
    LOGOUT({ commit }) {
      commit('setLogin', false);
      commit('landingVisited', false);
      localStorage.setItem('isLoggedIn', JSON.stringify(false));
    },
    LANDING_VISITED({ commit }, payload) {
      commit('landingVisited', payload);
    },
    SHOW_SNACK({ commit }, payload) {
      commit('setSnackBar', {
        model: true,
        text: payload,
        btn: '',
      });
    },
    SHOW_BTN_SNACK({ commit }, payload) {
      const { text, btn } = payload;
      commit('setSnackBar', {
        model: true,
        text,
        btn,
      });
    },
    SNACK_BTN_CLICK({ commit }, payload) {
      commit('setSnackBtnCLick', payload);
    },
    LOADING({ commit }, payload) {
      commit('setLoading', payload);
    },
    SET_LABELS({ commit }, payload) {
      commit('setLabels', payload);
    },
    ADD_LABEL({ commit }, payload) {
      commit('addLabel', payload);
    },
    UPDATE_LABEL({ commit }, payload) {
      commit('updateLabel', payload);
    },
    SET_FLASH_CARDS({ commit }, payload) {
      commit('setFlashCardSets', payload);
    },
    ADD_FLASH_CARD_SET({ commit }, payload) {
      commit('addFlashCardSet', payload);
    },
    UPDATE_FLASH_CARD_SET({ commit }, payload) {
      commit('updateFlashCardSet', payload);
    },
    DELETE_FLASH_CARD_SET({ commit }, payload) {
      commit('deleteFlashCardSet', payload);
    },
  },
  getters: {
    loading(state) {
      return state.loading;
    },
    user(state) {
      return state.user;
    },
    isOnline(state) {
      return state.isOnline;
    },
    snackBar(state) {
      return state.snackBar;
    },
    loggedIn(state) {
      return state.isLoggedIn;
    },
    labels(state) {
      return state.labels;
    },
    flashCardSets(state) {
      return state.flashCardSets;
    },
    landingVisited(state) {
      return state.landingVisited;
    },
    snackBtnCLicked(state) {
      return state.snackBtnCLick;
    },
  },
});
