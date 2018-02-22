import assert from 'assert'
import setup_debug from 'debug'
const debug = setup_debug('sleepsecure')

// Probably a terrible idea, but until someone complains ...
import {version} from './package.json'

import cheerio from 'cheerio'

import bhttp from 'bhttp'
import toughCookie from 'tough-cookie'
import FileStore from 'file-cookie-store'

import fs from 'fs-extra'
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
   return path.join(basedir.cache || getCacheDir(), 'sleepsecure') + path.sep
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
      if (this._cookie_store_path[this._cookie_store_path.length - 1] === path.sep)
         this._cookie_store_path += 'cookies.txt'

      debug(`Using '${this._cookie_store_path}' to store cookies`)

      this._cookies = new toughCookie.CookieJar(new FileStore(this._cookie_store_path))
      this._session = SleepSecureSession.createHTTPSession(this._cookies)
   }

   init(opts){ const that = this
      if (null == opts) opts = {}

      const cookie_store_dir = path.dirname(this._cookie_store_path)

      debug(`Creating '${cookie_store_dir}'`)
      return fs.ensureDir(cookie_store_dir).then(function(){
         that._initialized = true

         if (opts.do_login !== false)
            return that.login()
      })
   }

   // Logs the receiver Session object into SleepSecure. Returns a boolean `Promise`: `true` if the
   // login was successful; `false` if the password was incorrect.
   login(){ const that = this
      const login_info = {
         "username": this.username,
         "password": this.password,
         "Field": "First Choice" // "Keep me signed in", not that I'm sure it has any effect.
      }

      if (!this._initialized) {
         debug(".login() called without .init() — initializing ...")
         return this.init({do_login: false}).then(function(){ return that.login() })
      }

      debug('POSTing login-info')
      return this._session.post("https://s.sleepcycle.com/site/login", login_info, {
         followRedirects: false
      })
      .then(function(response){
         debug(`Received ${response.statusCode} "${response.statusMessage}" from /site/login`)
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
                  response.statusCode} "${response.statusMessage}"`)
               e.statusCode = response.statusCode
               throw e
         }

      })
   }

   // A wrapper around `bhttp.request()` to make requests to SleepSecure against this Session,
   // handling rejection of the stored cookie by re-logging-in. Defaults to GET.
   request(path, opts){ const that = this
      if (null == opts) opts = {}
      if (null == opts.method) opts.method = "get"

      if (!this._initialized) {
         debug(".request() called without .init() — initializing ...")
         return this.init({do_login: false}).then(function(){ return that.request(path, opts) })
      }

      return this._session.request("https://s.sleepcycle.com" + path, opts)
      .then(function(response){

         // SleepSecure handles an expired/bad login cookie by redirecting to `/site/login`:
         // XXX: ... does this clear the cookie? o_O
         if (response.redirectHistory && response.redirectHistory[0] &&
             response.redirectHistory[0].headers['location'] ===
               "https://s.sleepcycle.com/site/login") {

            if (that._rerequests >= 5)
               throw new Error("SleepCycle repeatedly rejecting login tokens. Aborting.")

            debug("Received 302 FOUND, indicating expired/invalid login token — re-logging-in")
            that._rerequests = (that._rerequests || 0) + 1

            return that.login().then(function(succeeded){
               if (!succeeded) {
                  throw new Error("SleepCycle rejected the given username/password.")
               } else {
                  return that.request(path, opts)
               }
            })

         } else {
            debug(`Received ${response.statusCode} "${response.statusMessage}" from ${path}`)
            return response
         }
      })
   }
}

export default SleepSecureSession
