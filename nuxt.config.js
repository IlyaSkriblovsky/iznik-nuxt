const pkg = require('./package')
const API = process.env.IZNIK_API || 'https://dev.ilovefreegle.org/api'

module.exports = {
  mode: 'spa',

  /*
  ** Headers of the page
  */
  head: {
    title: pkg.name,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
  },

  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#61AE24' },

  /*
  ** Global CSS
  */
  css: [
    '@/assets/css/style.css',
    '@/assets/css/user.less',
    '@/assets/css/Autocomplete.css'
  ],

  plugins: [
    // Our template formatting utils.
    '~/plugins/filters',

    // Naming components via HTML comments.
    '~/mixins/componentNames',

    // Our directives
    '~/plugins/directives',

    // Our parameters serialize differently from axios defaults
    { src: '~plugins/axios-serializer.js' },

    // { src: '~plugins/axios-log.js' },

    { src: '~/plugins/vuejs-thermometer' },
    { src: '~/plugins/qs' },
    { src: '~/plugins/twemoji' },
    { src: '~/plugins/vue2-filters' },
    { src: '~plugins/axios-token' },

    // Some plugins are client-side features
    { src: '~plugins/vuex-persistedstate', ssr: false },
    { src: '~plugins/vue-drag-drop.js', ssr: false },
    { src: '~plugins/vue-draggable-resizable.js', ssr: false },
    { src: '~plugins/vue-color', ssr: false },
    { src: '~plugins/vue-infinite-loading.js', ssr: false },
    { src: '~plugins/vue2-google-maps.js', ssr: false },
    { src: '~plugins/filepond-plugin-image-transform', ssr: false},
    { src: '~plugins/vue-debounce', ssr: false},
    { src: '~plugins/vue-highlight-words', ssr: false},
    { src: '~plugins/vue-awesome.js', ssr: false },
  ],

  /*
  ** Nuxt.js modules
  */
  modules: [
    'bootstrap-vue/nuxt',
    '@nuxtjs/moment',
    'nuxt-rfg-icon',
    '@nuxtjs/axios',
    '@nuxtjs/auth',
    '@nuxtjs/pwa',
    'cookie-universal-nuxt',
    [
      'nuxt-i18n',
      {
        locales: [
          {
            code: 'en',
            iso: 'en-GB'
          }
        ],
        defaultLocale: 'en',
        vueI18n: {
          fallbackLocale: 'en',
          messages: {
            en: {}
          }
        }
      }
    ],
  ],

  /*
  ** Axios module configuration
  */
  axios: {},

  /*
  ** Build configuration
  */
  build: {
    analyze: true,

    transpile: [/^vue2-google-maps($|\/)/],

    extend(config, ctx) {
      config.devtool = ctx.isClient ? 'eval-source-map' : 'inline-source-map'

      // Run ESLint on save
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/,
          options: {
            fix: true
          }
        })
      }
    },

    loaders: {
      less: { javascriptEnabled: true },
    },
  },

  env: {
    API: API,
    GOOGLE_MAPS_KEY: 'AIzaSyCdTSJKGWJUOx2pq1Y0f5in5g4kKAO5dgg',
    MODTOOLS: false
  },

  auth: {
    strategies: {
      local: false,
      native: {
        _scheme: '~/app/nativeStrategy.js'
      }
    },

    // We have some pages which can be viewed logged in or out so we don't want the build-in redirects.
    watchLoggedIn: false
  },

  vue: {
    config: {
      performance: true
    }
  },
}
