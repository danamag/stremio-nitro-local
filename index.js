const pUrl = require('url')

const { config, persist } = require('internal')

const needle = require('needle')
const cheerio = require('cheerio')

const defaults = {
	name: 'Nitro IPTV',
	prefix: 'nitro_',
	origin: 'http://nitroweb.ddns.net:25461',
	endpoint: 'http://nitroweb.ddns.net:25461/webplayer/',
	icon: 'https://mydingtv.com/wp-content/uploads/2019/02/Nitrous-TV.jpg',
	categories: [{"name":"NEWS","id":"16"},{"name":"NETWORKS","id":"5"},{"name":"ENTERTAINMENT","id":"18"},{"name":"MOVIES PREMIUM","id":"7"},{"name":"KIDS","id":"15"},{"name":"CANADA","id":"9"},{"name":"U.K.","id":"52"},{"name":"SPORTS (USA/CA)","id":"53"},{"name":"SPORTS LATINO AMERICA","id":"176"},{"name":"4K LIVE TV (45MB Min)","id":"214"},{"name":"UK SPORTS & INTL","id":"8"},{"name":"SKY SPORTS","id":"206"},{"name":"GERMAN/DUTCH","id":"234"},{"name":"MEXICO","id":"14"},{"name":"LATINO","id":"50"},{"name":"ARGENTINA","id":"196"},{"name":"SPAIN","id":"3"},{"name":"COLOMBIA","id":"168"},{"name":"HONDURAS","id":"197"},{"name":"NICARAGUA","id":"235"},{"name":"PERU","id":"199"},{"name":"CHILE","id":"198"},{"name":"DOMINICAN","id":"200"},{"name":"SALVADOR & COSTA RICA","id":"202"},{"name":"ECUADOR & BOLIVIA","id":"201"},{"name":"VENEZUELA & PARAGUAY","id":"204"},{"name":"PANAMA & URUGUAY","id":"203"},{"name":"CHRISTIAN","id":"174"},{"name":"MUSIC CHOICE","id":"169"},{"name":"PPV MOVIES","id":"166"},{"name":"PPV MOVIES ESPANOL","id":"181"},{"name":"MOVIES PLUS (DUAL AUDIO)","id":"184"},{"name":"24/7","id":"162"},{"name":"24/7 4K UHD","id":"217"},{"name":"24/7 CLASSIC TV","id":"85"},{"name":"24/7 British TV","id":"228"},{"name":"24/7 SAGAS","id":"216"},{"name":"24/7 SOUL TRAIN","id":"215"},{"name":"24/7 HORROR","id":"187"},{"name":"24/7 ANIME","id":"190"},{"name":"24/7 COOKING TV","id":"224"},{"name":"24/7 COMEDY","id":"159"},{"name":"24/7 MUSIC","id":"158"},{"name":"24/7 Music (ALTERNATIVE)","id":"227"},{"name":"24/7 MUSICA ESPANOL","id":"223"},{"name":"24/7 ESPANOL","id":"155"},{"name":"24/7 CARICATURAS","id":"194"},{"name":"24/7 KIDS","id":"163"},{"name":"24/7 NFL","id":"220"},{"name":"24/7 NBA","id":"219"},{"name":"24/7 MLB","id":"218"},{"name":"24/7 Futbol Soccer","id":"229"},{"name":"24/7 RACING","id":"230"},{"name":"24/7 UFC/MMA/BOXING","id":"222"},{"name":"24/7 BOXING","id":"231"},{"name":"24/7 SPORTS","id":"157"},{"name":"24/7 NHL","id":"221"},{"name":"24/7 FITNESS","id":"171"},{"name":"24/7 CHRISTMAS SPIRIT","id":"225"},{"name":"AUSTRALIA","id":"188"},{"name":"FRANCE & BELGIUM TEST","id":"211"},{"name":"CARIBBEAN","id":"182"},{"name":"ITALIA TEST","id":"205"},{"name":"PORTUGUESE","id":"20"},{"name":"PHILLIPINES TEST","id":"212"},{"name":"ARABIC TEST","id":"207"},{"name":"BRASIL","id":"61"},{"name":"AFRICAN TEST","id":"208"},{"name":"INDIA & PAKISTAN TEST (fixed)","id":"209"},{"name":"NOWSPORTS,EUROSPORT,ARENA & SKLUB","id":"233"},{"name":"FLOWSPORTS & ASTROSPORTS","id":"210"},{"name":"BEIN & ELEVEN SPORTS","id":"189"},{"name":"ESPN+ & COLLEGE EXTRA","id":"180"},{"name":"NFL SUNDAY TICKET","id":"105"},{"name":"NBA LEAGUE PASS","id":"110"},{"name":"NHL CENTER ICE","id":"111"},{"name":"MLB EXTRA INNINGS","id":"58"},{"name":"NCAAF & NCAAB PASS","id":"193"},{"name":"MLS SOCCER PASS","id":"195"},{"name":"3PM KICKOFFS / SOCCER","id":"109"},{"name":"RUGBY PASSES","id":"192"},{"name":"NBC GOLD","id":"108"},{"name":"PPV EVENTS (DAY OF ONLY)","id":"21"},{"name":"UFC FIGHT PASS","id":"183"},{"name":"HORSE RACING & MORE","id":"191"}]
}


let categories = []
let catalogs = []
const channels = {}
let token, cookies, origin, endpoint, ajaxEndpoint

const headers = {
	'Accept': 'text/plain, */*; q=0.01',
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest'
}

function setEndpoint(str) {
	if (str) {
		let host = str
		if (host.endsWith('/index.php'))
			host = host.replace('/index.php', '/')
		if (!host.endsWith('/'))
			host += '/'
		endpoint = host
		origin = endpoint.replace(pUrl.parse(endpoint).path, '')
		ajaxEndpoint = endpoint + 'includes/ajax-control.php'
		headers['Origin'] = origin
		headers['Referer'] = endpoint + 'index.php'
	}
	return true
}

setEndpoint(config.host || defaults.endpoint)

function setCatalogs(cats) {
	categories = cats
	catalogs = []
	cats.forEach(cat => {
		catalogs.push({
			id: defaults.prefix + 'cat_' + cat.id,
			name: cat.name,
			type: 'tv',
			extra: [ { name: 'search' } ]
		})
	})
	return true
}

setCatalogs(defaults.categories)

let loggedIn = false

// not using logout anywhere yet
function logout(cb) {
	const payload = 'action=logoutProcess'
	needle.post(ajaxEndpoint, payload, { headers, cookies }, (err, resp, body) => {
		if (!err) {
			loggedIn = false
			cookies = undefined
			cb(true)
		} else
			cb()
	})
}

function isLogedIn(cb) {
	if (loggedIn)
		return cb(true)
	const payload = 'action=webtvlogin&uname='+config.username+'&upass='+config.password+'&rememberMe=off'
	needle.post(ajaxEndpoint, payload, { headers, cookies }, (err, resp, body) => {
		if (body) {
			cookies = resp.cookies
			if (typeof body == 'string') {
				try {
					body = JSON.parse(body)
				} catch(e) {
					console.log(defaults.name + ' - Error')
					console.error(e.message || 'Unable to parse JSON response from ' + defaults.name + ' server')
				}
			}
			if (body.result == 'error') {
				console.log(defaults.name + ' - Error')
				console.error(body.message || 'Failed to log in')
				cb()
			} else if (body.result == 'success') {
				const msg = (body.message || {})
				if (msg.max_connections && msg.active_cons >= msg.max_connections) {
					console.log(defaults.name + ' - Error')
					console.error('Too many connections to ' + defaults.name + ' server, stop a connection and restart add-on')
					cb(false)
				} else {
					// login success
					loggedIn = true
					console.log(defaults.name + ' - Logged In')
					persist.setItem('loginData', msg)
					getCategories(success => {
						if (success)
							console.log(defaults.name + ' - Updated catalogs successfully')
						else
							console.log(defaults.name + ' - Could not update catalogs from server')

						cb(true)
					})
				}
			} else {
				console.log(defaults.name + ' - Error')
				console.error('Unknown response from server')
				cb()
			}
		} else {
			console.log(defaults.name + ' - Error')
			console.error('Invalid response from server')
			cb()
		}
	})
}

function request(url, payload, cb) {
	isLogedIn(() => { needle.post(url, payload, { headers, cookies }, cb) })
}

function findChannel(query, chans) {
	const results = []
	chans.forEach(chan => {
		if (chan.name.toLowerCase().includes(query.toLowerCase()))
			results.push(chan)
	})
	return results
}

function findMeta(id) {
	const idParts = id.split('_')
	const catId = idParts[1]
	let meta
	channels[catId].some(chan => {
		if (chan.id == id) {
			meta = chan
			return true
		}
	})
	return meta
}

function getCatalog(reqId, cb) {
	const id = reqId.replace(defaults.prefix + 'cat_', '')
	if (channels[id] && channels[id].length)
		cb(channels[id])
	else {
		const payload = 'action=getStreamsFromID&categoryID=' + id + '&hostURL=' + encodeURIComponent('http://' + persist.getItem('loginData').url + ':' + persist.getItem('loginData').port + '/')
		request(ajaxEndpoint, payload, (err, resp, body) => {
			if (!err && body) {
				const $ = cheerio.load(body)
				channels[id] = []

				$('li.streamList').each((ij, el) => {
					const elem = $(el)
					let poster = $(el).find('img').attr('src')
					if (poster.startsWith('images/'))
						poster = endpoint + poster
					channels[id].push({
						id: defaults.prefix + id + '_' + elem.find('.streamId').attr('value'),
						type: 'tv',
						name: elem.find('label').text().trim(),
						poster, background: poster, logo: poster,
						posterShape: 'square'
					})
				})

				cb(channels[id])
			} else
				cb(false)
		})
	}
}

function addZero(deg) {
	return ('0' + deg).slice(-2)
}

function getCategories(cb) {
	const date = new Date()
	const payload = 'dateFullData=' + (date.getDay() +1) + '-' + (date.getMonth() +1) + '-' + date.getFullYear() + '+' + encodeURIComponent(addZero(date.getHours()) + ":" + addZero(date.getMinutes()) + ":" + addZero(date.getSeconds()))
	needle.post(endpoint + 'live.php', payload, { headers, cookies }, (err, resp, body) => {
		if (!err && body) {
			const $ = cheerio.load(body)
			const results = []
			$('.cbp-spmenu li a').each((ij, el) => {
				const elm = $(el)
				results.push({ name: elm.text().trim(), id: elm.attr('data-categoryid') })
			})
			if (results.length) {
				setCatalogs(results)
				cb(true)
			} else
				cb(false)
		} else
			cb(false)
	})
}

function retrieveManifest() {
	function manifest() {
		return {
			id: 'org.' + defaults.name.toLowerCase().replace(/[^a-z]+/g,''),
			version: '1.0.0',
			name: defaults.name,
			description: 'IPTV Service - Requires Subscription',
			resources: ['stream', 'meta', 'catalog'],
			types: ['tv'],
			idPrefixes: [defaults.prefix],
			icon: defaults.icon,
			catalogs
		}
	}

	return new Promise((resolve, reject) => {
		isLogedIn(() => { resolve(manifest()) })
	})
}

async function retrieveRouter() {
	const manifest = await retrieveManifest()

	const { addonBuilder, getInterface, getRouter } = require('stremio-addon-sdk')

	const builder = new addonBuilder(manifest)

	builder.defineCatalogHandler(args => {
		return new Promise((resolve, reject) => {
			const extra = args.extra || {}
			getCatalog(args.id, catalog => {
				if (catalog) {
					let results = catalog
					if (extra.search)
						results = findChannel(extra.search, catalog)
					if (results.length)
						resolve({ metas: results })
					else
						reject(defaults.name + ' - No results for catalog request')
				} else
					reject(defaults.name + ' - Invalid catalog response')
			})
		})
	})

	builder.defineMetaHandler(args => {
		return new Promise((resolve, reject) => {
			const meta = findMeta(args.id)
			if (!meta) reject(defaults.name + ' - Could not get meta')
			else resolve({ meta })
		})
	})

	builder.defineStreamHandler(args => {
		return new Promise((resolve, reject) => {
			const meta = findMeta(args.id)
			if (!meta) reject(defaults.name + ' - Could not get meta for stream')
			else {
				const chanId = args.id.split('_')[2]
				const url = 'http://' + persist.getItem('loginData').url + ':' + persist.getItem('loginData').port + '/live/' + config.username + '/' + config.password + '/' + chanId + '.m3u8'
				resolve({ streams: [ { title: 'Stream', url } ] })
			}
		})
	})

	const addonInterface = getInterface(builder)

	return getRouter(addonInterface)

}

module.exports = retrieveRouter()
