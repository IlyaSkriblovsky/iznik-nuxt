import Vue from 'vue'

export let mobilestate = {
  isiOS: false
}

const pushstate = Vue.observable({
  pushed: false, // Set to true to handle push in Vue context
  route: false,
  mobilePushId: false // Note: mobilePushId is the same regardless of which user is logged in
})

let acceptedMobilePushId = false
let mobilePush = false
let lastPushMsgid = false

window.iznikroot = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1)
window.iznikroot = decodeURI(window.iznikroot.replace(/%25/g, '%2525'))
console.log('window.iznikroot ' + window.iznikroot)

const cordovaApp = {
  initialize: function() {
    console.log('--------------initapp--------------')
    document.addEventListener(
      'deviceready',
      this.onDeviceReady.bind(this),
      false
    )
  },

  // deviceready Event Handler
  //
  // Bind any cordova events here. Common events are: 'pause', 'resume', etc.
  onDeviceReady: function () {
    try {
      console.log('cordovaApp: onDeviceReady')

      mobilestate.isiOS = window.device.platform === 'iOS'
      // if (!window.initialURL) {
      //   window.initialURL = window.location.href
      // }
      // $.ajaxSetup({
      //   mobileapp: 1
      // });

      // document.addEventListener("offline", function () { window.isOnline = false; console.log("offline"); window.showNetworkStatus() }, false);
      // document.addEventListener("online", function () { window.isOnline = true; console.log("online"); window.showNetworkStatus() }, false);

      // We have a busy indicator
      /* $(document).ajaxStop(function() {
        $('#spinner').hide();
        // We might have added a class to indicate that we were waiting for an AJAX call to complete.
        $('.showclicked').removeClass('showclicked');
        window.hideHeaderWait();
      });
  
      $(document).ajaxStart(function () {
        $('#spinner').show();
        window.showHeaderWait();
        if ((navigator.connection.type != Connection.NONE) && !window.isOnline) { // Remove red cloud if we are now actually online
          console.log("ajaxStart fire online");
          var event = new Event('online');
          document.dispatchEvent(event);
        }
      }); */

      if (!mobilestate.isiOS) {
        // Enable pinch zoom on Android
        cordova.plugins.ZoomControl.ZoomControl('true') // enabling zoom control: setBuiltInZoomControls(true), setDefaultZoom(ZoomDensity.MEDIUM), setSupportZoom(true)
        cordova.plugins.ZoomControl.setBuiltInZoomControls('true') // Sets whether the WebView should use its built-in zoom mechanisms
        cordova.plugins.ZoomControl.setDisplayZoomControls('true') // Sets whether the WebView should display on-screen zoom controls when using the built-in zoom mechanisms. 
        cordova.plugins.ZoomControl.setUseWideViewPort('true') // Sets whether the WebView should enable support for the "viewport" HTML meta tag or should use a wide viewport.
      }

      console.log('push init start')
      if ((typeof window.PushNotification === 'undefined') || (!PushNotification)) {
        console.log('NO PUSH NOTIFICATION SERVICE')
        // alert("No PN");
      } else if (!pushstate.mobilePushId) {
        mobilePush = window.PushNotification.init({
          android: {
            senderID: '423761283916', // FCM: https://console.firebase.google.com/project/scenic-oxygen-849/settings/general/android:org.ilovefreegle.direct
            // senderID: "845879623324", // Old GCM way
            sound: false,
            iconColor: '#5EcA24', // Freegle green
            icon: 'icon'
            // forceShow: true,
          },
          ios: {
            // senderID: "845879623324",
            alert: true,
            badge: true,
            sound: false
          }
        })
        mobilePush.on('registration', function (data) {
          pushstate.mobilePushId = data.registrationId
          console.log('push registration ' + pushstate.mobilePushId)
          // mobilePushId reported in to server in savePushId() by store/auth.js fetchUser
          // The watch code below also calls savePushId() in case we've already logged in
        })

        // Called to handle a push notification
        //
        // Note: before each notification, we send a first notification with count = 0 to clear notifications in Android
        // Each notification will arrive twice if received in background/stopped: a doubleEvent
        //
        // Android:
        //  In foregound:   foreground: true:   doubleEvent: false
        //  In background:  foreground: false:  doubleEvent: false
        //           then:  foreground: false:  doubleEvent: true
        //  Not running:    as per background
        //
        // iOS:
        //  In foregound:   foreground: true:   doubleEvent: false
        //  In background:  foreground: false:  doubleEvent: false
        //           then:  foreground: false:  doubleEvent: true
        //  Not running:    as per background?
        //
        // Navigating in background works, so quit if doubleEvent

        mobilePush.on('notification', function (data) {
          console.log('push notification')
          console.log(data)
          const foreground = data.additionalData.foreground.toString() === 'true' // Was first called in foreground or background
          //let msgid = new Date().getTime() // Can't tell if double event if notId not given
          let msgid = 0
          if ('notId' in data.additionalData) {
            msgid = data.additionalData.notId
          }
          const doubleEvent = !foreground && msgid !== 0 && msgid === lastPushMsgid
          lastPushMsgid = msgid
          if (!('count' in data)) {
            data.count = 0
          }
          data.count = parseInt(data.count)
          console.log('foreground ' + foreground + ' double ' + doubleEvent + ' msgid: ' + msgid + ' count: ' + data.count)
          if (data.count === 0) {
            mobilePush.clearAllNotifications() // no success and error fns given
            console.log('clearAllNotifications')
          }
          mobilePush.setApplicationIconBadgeNumber(function () { }, function () { }, data.count)

          if (!doubleEvent) {
            // Pass route to go to (or update) but only if in background or just starting app
            // Note: if in foreground then rely on count updates to inform user
            if (!foreground && 'route' in data.additionalData) {
              pushstate.route = data.additionalData.route // eg /chat/123456 or /chats
            }

            // Trigger event handler
            pushstate.pushed = true
          }

          // iOS needs to be told when we've finished: do it after a short delay to allow our code to run
          if (mobilestate.isiOS) {
            setTimeout(function () {
              mobilePush.finish(
                function () {
                  console.log('iOS push finished OK')
                },
                function () {
                  console.log('iOS push finished error')
                },
                data.additionalData.notId
              )
            }, 50)
          }
        })
      }
    } catch (e) {
      console.log('onDeviceReady catch', e)
    }
  }
}

// Tell server our push notification id
// Cope if not logged in ie do it later
export async function savePushId(store) {
  if (acceptedMobilePushId !== pushstate.mobilePushId) {
    const params = {
      notifications: {
        push: {
          type: mobilestate.isiOS ? 'FCMIOS' : 'FCMAndroid',
          subscription: pushstate.mobilePushId
        }
      }
    }
    const data = await store.$api.session.save(params)
    if (data.ret === 0) {
      acceptedMobilePushId = pushstate.mobilePushId
      console.log('savePushId: saved OK')
    } else { // 1 === Not logged in
      console.log('savePushId: Not logged in: OK will try again when signed in')
    }
  }
}

// Remember if we've logged out
// It could tell the server to invalidare pushid
// However we simply zap acceptedMobilePushId so it is sent when logged in
export function logoutPushId() {
  acceptedMobilePushId = false
  console.log('logoutPushId')
}

// Set home screen badge count
let lastBadgeCount = -1;
export function setBadgeCount(badgeCount) {
  if (badgeCount !== lastBadgeCount) {
    if (process.env.IS_APP) {
      console.log('setBadgeCount', badgeCount)
      if (mobilePush) {
        mobilePush.setApplicationIconBadgeNumber(function () { }, function () { }, badgeCount)
        lastBadgeCount = badgeCount
      }
    }
  }
}

/* // Fix up CSS cases with absolute url path
var style = document.createElement('style')
style.type = 'text/css'
var css = '.bodyback { background-image: url("' + iznikroot + 'images/wallpaper.png") !important; } \r'
css += '.dd .ddTitle{color:#000;background:#e2e2e4 url("' + iznikroot + 'images/msdropdown/skin1/title-bg.gif") repeat-x left top !important; } \r'
css += '.dd .ddArrow{width:16px;height:16px; margin-top:-8px; background:url("' + iznikroot + 'images/msdropdown/skin1/dd_arrow.gif") no-repeat !important;} \r'
css += '.splitter { background: url("' + iznikroot + 'images/vsizegrip.png") center center no-repeat !important; } \r'
style.innerHTML = css
//console.log(css)
document.getElementsByTagName('head')[0].appendChild(style) */

// When the plugin is loaded at runtime, a watches are setup...
// https://github.com/vuejs/rfcs/blob/function-apis/active-rfcs/0000-function-api.md#watchers
export default ({ app, store }) => { // route
  if (process.env.IS_APP) {
    // When mobilePushId changed, tell server our push notification id
    store.watch(
      () => pushstate.mobilePushId,
      mobilePushId => {
        if (mobilePushId) {
          savePushId(store)
        }
      }
    )
    // When push received, refetch notification and chat counts, and go to route if given
    store.watch(
      () => pushstate.pushed,
      pushed => {
        if (pushed) {
          store.dispatch('notifications/count')
          store.dispatch('chats/listChats')

          if (pushstate.route) {
            pushstate.route = pushstate.route.replace('/chat/', '/chats/') // Match redirects in nuxt.config.js
            if (app.router.currentRoute.path !== pushstate.route) {
              console.log('GO TO ', pushstate.route)
              app.router.push({ path: pushstate.route })
            }
          }

          pushstate.pushed = false
          pushstate.route = false
        }
      }
    )
  }
}

if (process.env.IS_APP) {
  cordovaApp.initialize()
  console.log('--------------initedapp--------------')
}