import assert from 'assert'
import setup_debug from 'debug'
const debug = setup_debug('sleepsecure')

// Probably a terrible idea, but until someone complains ...
import {version} from './package.json'

import cheerio from 'cheerio'

import bhttp from 'bhttp'
import toughCookie from 'tough-cookie'
import FileStore from 'file-cookie-store'

import os from 'os'
import path from 'path'
import osenv from 'osenv'
import basedir from 'xdg-basedir'

import http_status from 'http-status'


// ### Configuration
const user_agent = `npm-sleepsecure/${version} (Complaints: http://ell.io/tt$sleepsecure)`
debug('User-Agent:', user_agent)


// ### Setup
const session_regex = /javascript:gotoSession\((\d+)\)/

function getCacheDir(){
   // ripped out of 'configstore'
   const user = (osenv.user() || uuid.v4()).replace(/\\/g, '')
   return path.join(os.tmpdir(), user, '.cache')
}

function getDefaultCookieStorePath(){
   return path.join(basedir.cache || getCacheDir(), 'sleepsecure', 'cookies.txt')
}

// Helper-function, called in an `assert`, allowing the function to be compiled-away by `unassert`
function countErrorAlerts(document){
   const $ = cheerio.load(document)
   const error_alerts = $('.alert-error')
   return error_alerts.length
}


// ### API
class SleepSecureSession {
   static createHTTPSession(cookie_jar){
      return bhttp.session({
         headers: {'user-agent': user_agent},
         cookieJar: cookie_jar
      })
   }

   constructor(username, password, opts){
      if (null == opts) opts = {}

      this.username = username
      this.password = password

      this._cookie_store_path = opts.cookie_store_path || getDefaultCookieStorePath()
      debug(`Using '${this._cookie_store_path}' to store cookies`)

      this._cookies = new toughCookie.CookieJar(new FileStore(this._cookie_store_path))
      this._session = SleepSecureSession.createHTTPSession(this._cookies)
   }

   // Logs the receiver Session object into SleepSecure. Returns a boolean `Promise`: `true` if the
   // login was successful; `false` if the password was incorrect.
   login(){
      const login_info = {
         "username": this.username,
         "password": this.password,
         "Field": "First Choice" // "Keep me signed in", not that I'm sure it has any effect.
      }

      debug('POSTing login-info')
      return this._session.post("https://s.sleepcycle.com/site/login", login_info, {
         followRedirects: false
      })
      .then(function(response){
         debug(`Received ${response.statusCode} "${http_status[response.statusCode]}" from /site/login`)
         switch (response.statusCode) {

            // Unintuitively, SleepSecure returns HTTP 200: OK if your login information is
            // incorrect; this is made clearer in the HTML source.
            case http_status.OK:
               assert(countErrorAlerts(response.body) >= 1)

               return false
               break

            // An HTTP 302: FOUND indicates a successful login, redirecting to the dashboard.
            case http_status.FOUND:
               assert(response.headers['location'] === "https://s.sleepcycle.com/")

               return true
               break

            default:
               const e = new Error(`SleepSecure returned an unexpected HTTP status: ${
                  response.statusCode} "${http_status[response.statusCode]}"`)
               e.statusCode = response.statusCode
               throw e
         }

      })
   }

   // A wrapper to make requests to SleepSecure against this Session, handling rejection of the
   // stored cookie by re-logging-in.

   // FIXME: Reset the session on session-denied errors
   // case http_status.FOUND: // 302 FOUND, indicates a bad login cookie
   //    assert(response.headers['location'] === "https://s.sleepcycle.com/site/login")
}

// ### Make request ...
new SleepSecureSession('this_isnt_a_real_account', 'fail')
.login().then(function(succeeded){ assert(succeeded) })
.then(function(_){ return cookie_jar.get("https://s.sleepcycle.com/site/comp/calendar") })

.then(function(response){
   const $ = cheerio.load(response.body)
   const session_links = $('table tr:nth-child(1) .description a')
   assert.strictEqual(session_links.length, 1)
   assert.strictEqual(typeof session_links[0].attribs.href, 'string')

   const session_id = session_regex.exec(session_links[0].attribs.href)[1]
   console.log("Latest sleep-session ID:", session_id)
})
