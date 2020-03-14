module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pwa: {
    name: 'Flashcards',
    themeColor: '#E91E63',
    msTileColor: '#ECECEC',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    manifestOptions: {
      "name": "Flashcards - Learn & Memorize",
      "short_name": "Flashcards",
      "description": "A learning and memorization helper app",
      "theme_color": "#E91E63",
      "display": "fullscreen",
      "background_color": "#ECECEC",
      "icons": [{
        "src": "img/icons/apple-touch-icon-60x60.png",
        "sizes": "60x60",
        "type": "image/png"
      }, {
        "src": "img/icons/icon-72x72.png",
        "sizes": "72x72",
        "type": "image/png"
      }, {
        "src": "img/icons/apple-touch-icon-76x76.png",
        "sizes": "76x76",
        "type": "image/png"
      }, {
        "src": "img/icons/icon-96x96.png",
        "sizes": "96x96",
        "type": "image/png"
      }, {
        "src": "img/icons/apple-touch-icon-120x120.png",
        "sizes": "120x120",
        "type": "image/png"
      }, {
        "src": "img/icons/icon-128x128.png",
        "sizes": "128x128",
        "type": "image/png"
      }, {
        "src": "img/icons/msapplication-icon-144x144.png",
        "sizes": "144x144",
        "type": "image/png"
      }, {
        "src": "img/icons/mstile-150x150.png",
        "sizes": "150x150",
        "type": "image/png"
      }, {
        "src": "img/icons/apple-touch-icon-152x152.png",
        "sizes": "152x152",
        "type": "image/png"
      }, {
        "src": "img/icons/apple-touch-icon-180x180.png",
        "sizes": "180x180",
        "type": "image/png"
      }, {
        "src": "img/icons/android-chrome-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      }, {
        "src": "img/icons/icon-384x384.png",
        "sizes": "384x384",
        "type": "image/png",
        "purpose": "any maskable"
      }, {
        "src": "img/icons/android-chrome-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }, ]
    },
  }
}