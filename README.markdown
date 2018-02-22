`sleepsecure` <a target="_blank" href="https://github.com/ELLIOTTCABLE/sleepsecure/pulse/monthly"><img alt='Maintenance status: Last active in 2018' src="https://img.shields.io/maintenance/yes/2018.svg"></a><img src="http://elliottcable.s3.amazonaws.com/p/8x8.png"><a target="_blank" href="https://github.com/ELLIOTTCABLE/sleepsecure/releases"><img alt='Versions & releases' src="https://img.shields.io/npm/v/sleepsecure.svg?label=release"></a><img src="http://elliottcable.s3.amazonaws.com/p/8x8.png"><a target="_blank" href="https://npmjs.com/package/sleepsecure"><img alt='sleepsecure on the NPM registry' src="https://img.shields.io/npm/dt/sleepsecure.svg?label=npm+installs"></a><img src="http://elliottcable.s3.amazonaws.com/p/8x8.png"><a target="_blank" href="LICENSE"><img alt='Open-source licensing details' src="https://img.shields.io/badge/license-0BSD-blue.svg"></a><img src="http://elliottcable.s3.amazonaws.com/p/8x8.png"><a target="_blank" href="http://ell.io/IRC"><img alt='Chat on Freenode' src="https://img.shields.io/badge/chat-IRC-blue.svg"></a><img src="http://elliottcable.s3.amazonaws.com/p/8x8.png"><a target="_blank" href="http://twitter.com/ELLIOTTCABLE"><img alt='Twitter followers' src="https://img.shields.io/twitter/follow/ELLIOTTCABLE.svg?style=flat&label=followers&logo=twitter&color=blue"></a>
=============
One of my favourite smartphone apps is [SleepCycle][]; it records details of your sleep-quality
using your phone's microphone and accelerometer, and tracks changes in that quality over time.

In addition, they offer a paid service that uploads your sleep-data to their servers, titled
“[SleepSecure][].” Unfortunately — despite repeated inquiries over the last six(!) years — Northcube
has never found the time or developer resources to expose any sort of official API for that sleep-
data. `)=`

In the interim, thus, I've written a little scraping-tool: given a SleepSecure login and password, I
can extract sleep-data via HTML-scraping of the SleepSecure dashboard.

   [SleepCycle]: <https://sleepcycle.com> "Smart alarm-clock for iOS and Android"
   [SleepSecure]: <https://s.sleepcycle.com> "Northcube's sleep-data-tracking service"

Caveats
-------
It's important to understand that this is **not an API client**. There is no official SleepSecure
API. This is a *scraping* tool, which means that it's hitting Northcube's servers in a way for which
they were not designed.

Based simply on the load-time of the SleepSecure dashboard, I'm pretty sure their web-app isn't
exactly performance-optimized — and I have no idea what sort of server resources they're paying for.
Take a gander at the “Basic Web Scraping Etiquette” section of Sebastian Wain's ‘[Ultimate Guide to
Web Scraping]’; and attempt some backing-off behaviour if requesting information from their servers
fairly often.

(You reading this, Northcube? Feel free to open [an Issue][issues] if you'd prefer this operated in
a different way! I'm happy to cooperate! `<3`)

   [Ultimate Guide to Web Scraping]: <http://blog.databigbang.com/tag/the-ultimate-guide-to-web-scraping/>
      "Sebastian Wain's write-up on web-scraping"
   [issues]: <https://github.com/ELLIOTTCABLE/sleepsecure/issues> "Issues for this project"

Usage
-----
```sh
npm install sleepsecure
```

This module exposes a single class; let's call it `Session`:

```js
import SleepSecureSession from 'sleepsecure'
```

Each `Session` requires log-in information:

```js
const sss = new SleepSecureSession('cool_dude@gmail.com', 'snicker snicker sekrit')
```

One of the primary purposes of the library is to handle persistence of the login cookies necessary
to make requests, and re-authentication whenever that token expires. Generally speaking, you *don't*
need to explicitly instruct the library to log-in — however, if you want to pre-emptively ensure
logging-in is successful, you can explicitly issue a call to `::login()`:

```js
if (!(await sss.login()))
   console.error("Unable to log in! Double-check your username and password?")
```

The cookies default to being stored according to the XDG spec (generally, under `~/.cache`); but a
specific filename can be provided as configuration:

```js
new SleepSecureSession('someone', 'wizardry', { cookie_store_path: '~/.sleepsecure.txt' })
```

More specific methods are presumably forthcoming; but at the moment, the only interface to
SleepSecure's data that is provided is a wrapper around [`bhttp`][bhttp]'s `::request()` function,
that additionally handles authentication and session-management:

```js
sss.request("/site/comp/calendar")
.then(function(response){
   const $ = cheerio.load(response.body)

   $('tr:not(:nth-child(1))', 'table').each(function(){
      const date = $('.description > a', this).text()
          , quality = $('.value', this).first().text()

      console.log(`On ${date}, my sleep quality was ${quality}.`) }) })
```

   [bhttp]: <https://github.com/joepie91/node-bhttp> "Sven Slootweg's `bhttp` session-management library"
