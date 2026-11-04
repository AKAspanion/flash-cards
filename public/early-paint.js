// Runs before the app loads: paints the saved theme's background so there is no white flash.
// Loaded from a file because the site's CSP blocks inline scripts. The key and colours match
// src/stores/prefs.ts ('dark') and src/plugins/vuetify.ts (theme backgrounds).
try {
  document.documentElement.style.background = localStorage.getItem('dark') === 'true' ? '#121212' : '#ECECEC';
} catch {
  document.documentElement.style.background = '#ECECEC';
}
