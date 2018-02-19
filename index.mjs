import assert from 'assert'

// Probably a terrible idea, but until someone complains ...
import {version} from './package.json'

import bhttp from 'bhttp'
import cheerio from 'cheerio'


const user_agent = `npm-sleepsecure/${version} (Complaints: http://ell.io/tt$sleepsecure)`
console.log(user_agent)

const login_info = {
   "username": "sleepcycle.com@elliottcable.com",
   "password": "coulomb-nosed-oarlock-identify-houston-triple-fusion"
}


const session_regex = /javascript:gotoSession\((\d+)\)/

const cookie_jar = bhttp.session({ headers: {"user-agent": user_agent} })

cookie_jar.post("https://s.sleepcycle.com/site/login", login_info, {
   followRedirects: false
})
.then(function(response) {
   assert.strictEqual(response.statusCode, 302)
})
.then(function(_){ return cookie_jar.get("https://s.sleepcycle.com/site/comp/calendar") })

.then(function(response){
   const $ = cheerio.load(response.body)
   const session_links = $('table tr:nth-child(1) .description a')
   assert.strictEqual(session_links.length, 1)
   assert.strictEqual(typeof session_links[0].attribs.href, 'string')

   const session_id = session_regex.exec(session_links[0].attribs.href)[1]
   console.log("Latest sleep-session ID:", session_id)
})
