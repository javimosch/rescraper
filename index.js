const sequential = require('promise-sequential')
var { getPuppeteerPage, closePupeteerBrowser } = require('./utils/puppeteer')
const PROCESS_TRIPADVISOR_LIST = false
const DEBUG = true
    //
const RESULT_PATH = './results.json'
    //
const puppeteer = require('puppeteer')
const sander = require('sander')
run()
async function run() {
    // global browser
    let page = await getPuppeteerPage()

    var result = {}
    if (await sander.exists(RESULT_PATH)) {
        result = JSON.parse((await sander.readFile(RESULT_PATH)).toString('utf-8'))
    }

    result.tripadvisorListPages = result.tripadvisorListPages || {}
    result.tripadvisorList = result.tripadvisorList || []

    /*
    let emails = [];
    result.tripadvisorList.forEach(item => {
        if (!!item.email) emails.push(item.email);
    })
    emails = emails.map(email => {
        return email.split('?subject=?').join('').split('?__xts__=').join('')
    }).slice(0, 100)
    console.log(emails.length)
    await sander.writeFile('./tmp/emails.json', emails.join('\r\n'))
    console.log('EXIT')
    process.exit(0)
*/

    if (PROCESS_TRIPADVISOR_LIST) {
        let pages = Object.keys(result.tripadvisorListPages)
        await sequential(
            pages.map((url, index) => {
                return () =>
                    (async function() {
                        // if (result.tripadvisorListPages[url]) {
                        //    console.log('LIST', index, 'SKIP')
                        // } else {
                        console.log('LIST', index)
                        result.tripadvisorList = await require('./tripadvisor/list').scrapeItems(
                            result.tripadvisorList, {
                                url,
                                page
                            }
                        )
                        result.tripadvisorListPages[url] = true
                        await saveResultFile(result)
                            // }
                    })()
            })
        )

        await closePupeteerBrowser()
        console.log('EXIT')
        process.exit(0)
    } else {
        if (!(result.tripadvisorList && result.tripadvisorList.length > 0)) {
            throw new Error('TRIPADVISOR_LIST_REQUIRED')
        }
    }

    var filteredList = result.tripadvisorList.filter(filterItems)
    await sequential(
        filteredList.map((item, index) => {
            return last =>
                processTripadvisorListItem(item, index, filteredList.length)
        })
    )

    function filterItems(item) {
        return !item.email
    }

    async function processTripadvisorListItem(item, curr, total) {
        let url = item.metadata.tripadvisor.detailsUrl
        if (url.indexOf('www.trip') === -1) {
            url = 'https://www.tripadvisor.es' + url
        }
        item = await require('./tripadvisor/details.js').scrapeItem(url, item, {
            page,
            debug: DEBUG
        })
        await saveResultFile(result)
        console.log(
            `Loading ${curr + 1}/${total} (${result.tripadvisorList.length -
        total} are OK)`
        )
    }
}

async function saveResultFile(data) {
    data.totalEmails = data.tripadvisorList.filter(tl => !!tl.email).length
    await sander.writeFile(RESULT_PATH, JSON.stringify(data, null, 4))
}