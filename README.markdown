`sleepsecure`
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
