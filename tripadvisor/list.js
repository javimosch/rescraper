const cheerio = require('cheerio')
const waitQuerySelectorAll = require('../utils/waitQuerySelectorAll')
const mergeData = require('../utils/mergeData')
const RESULT_PATH = './results.json'

module.exports = {
    scrapeItems,
    scrapeListPages
}

function idle(timeout = 100) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), timeout)
    })
}

async function scrapeListPages(url = '', options = {}) {
    let page = options.page
    options.times = options.times || 0
    await idle(1000)
    if (!url) {
        if (!process.env.TA_URL) throw new Error('TA_URL required')
        url = process.env.TA_URL
    }

    let sander = require('sander')
    let json = JSON.parse((await sander.readFile(RESULT_PATH)).toString('utf-8'))

    json.tripadvisorListPages = json.tripadvisorListPages || {}
    json.tripadvisorListPages[url] =
        typeof json.tripadvisorListPages[url] === 'undefined' ?
        false :
        json.tripadvisorListPages[url]

    await sander.writeFile(RESULT_PATH, JSON.stringify(json, null, 4))
    try {
        await page.goto(url)
        const bodyHandle = await page.$('body')
        var result = await waitQuerySelectorAll(
            '.pagination a.next',
            page,
            bodyHandle, {
                timeout: 10000
            }
        )

    const browser = await require('puppeteer').launch(require('../config').puppeteer)
    const page = await browser.newPage()
    await page.goto(url)
    const bodyHandle = await page.$('body')
    var result = await waitQuerySelectorAll('.pagination a.next', page, bodyHandle, {
        timeout: 10000
    })
    await browser.close()
    var nextButtonHref = ''
    if (result.items.length > 0) {
        let nextButton = result.items[0]
        if (!!nextButton) {
            nextButtonHref = result.$(nextButton).attr('href')
        }
        }
        let nextUrl = `https://www.tripadvisor.fr${nextButtonHref}`
        options.times++
            options.cb && options.cb(options.times)
        return await scrapeListPages(nextUrl, options)
    } catch (err) {
        console.log('RETRY..', err.message)
        return await scrapeListPages(url, options)
    }

}

async function scrapeItems(list = [], options = {}) {
    const browser = await puppeteer.launch(require('../config').puppeteer)
    let html = ''
    var page = options.page
    if (!options.url) {
        throw new Error('options.url required')
    }
    var url = options.url
    await page.goto(url)
    const bodyHandle = await page.$('body')
    let selector = '.ui_column.is-narrow.title_wrap a'
    let selector2 = '.title .property_title'
    var items = []
    var $ = null

    try {
        var rr = await waitQuerySelectorAll(selector, page, bodyHandle, {
            timeout: 5000
        })
        console.log('rr 1', rr.items.length)
        items = rr.items
        $ = rr.$
    } catch (err) {
        console.log(err.stack)
        var rr = await waitQuerySelectorAll(selector2, page, bodyHandle, {
            timeout: 5000
        })
        console.log('rr 2', rr.items.length)
        items = rr.items
        $ = rr.$
    }

    let newList = await Promise.all(
        items.map(item => {
            return processTripadvisorListItem($(item))
        })
    )

    newList = newList.filter(item => {
        return (!!item.title &&
            item.metadata.tripadvisor &&
            !!item.metadata.tripadvisor.detailsUrl
        )
    })

    let unmergedItems = []

    for (var x in newList) {
        let match = false
        for (var y in list) {
            if (
                list[y].metadata.tripadvisor.detailsUrl ==
                newList[x].metadata.tripadvisor.detailsUrl
            ) {
                mergeData(list[x], newList[x])
                match = true
            }
        }
        if (!match) {
            unmergedItems.push(newList[x])
        }
    }

    unmergedItems.forEach(item => list.push(item))

    console.log('list has now', list.length)

    return list

    async function processTripadvisorListItem(item) {
        let itemTitle = item.html()
        let itemDetailsUrl = item.attr('href') || item.attr('data-url')
        return {
            title: itemTitle,
            metadata: {
                tripadvisor: {
                    detailsUrl: itemDetailsUrl
                }
            }
        }
    }
}