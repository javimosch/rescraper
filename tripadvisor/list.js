const puppeteer = require('puppeteer')
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

async function scrapeListPages(url = '') {
    await idle(1000)
    if (!url) {
        if (!process.env.TA_URL) throw new Error('TA_URL required')
        url = process.env.TA_URL
    }

    let sander = require('sander')
    let json = JSON.parse((await sander.readFile(RESULT_PATH)).toString('utf-8'))

    json.tripadvisorListPages = json.tripadvisorListPages || {}
    json.tripadvisorListPages[url] = typeof json.tripadvisorListPages[url] === 'undefined' ? false : json.tripadvisorListPages[url];

    await sander.writeFile(RESULT_PATH, JSON.stringify(json, null, 4))

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
    return await scrapeListPages(nextUrl)
}

async function scrapeItems(list = [], options = {}) {
    const browser = await puppeteer.launch(require('../config').puppeteer)
    let html = ''
    const page = await browser.newPage()
    if (!options.url) {
        throw new Error('options.url required')
    }
    var url = options.url
    await page.goto(url)
    const bodyHandle = await page.$('body')
        //html = await page.evaluate(body => body.innerHTML, bodyHandle)
        //
        //const $ = cheerio.load(html)      
        //let items = $('.ui_column.is-narrow.title_wrap span a')
        //items = items.toArray()

    //'.ui_column.is-narrow.title_wrap a'
    //.title.property_title
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

    let result = await Promise.all(
        items.map(item => {
            return processTripadvisorListItem($(item))
        })
    )



    let newList = result.filter(item => {
        return !!item.title && item.metadata.tripadvisor && !!item.metadata.tripadvisor.detailsUrl
    })
    await browser.close()

    let mergedItems = []



    list.forEach(function eachListItem(item) {
        try {
            let match = newList.find(single => {
                return (
                    single.metadata.tripadvisor.detailsUrl ==
                    item.metadata.tripadvisor.detailsUrl
                )
            })
            if (match) {
                mergedItems.push(item.metadata.tripadvisor.detailsUrl)
                mergeData(item, match)
            }
        } catch (err) {}
    })


    let unmergedItems = []
    try {
        unmergedItems = newList.filter(item => !mergedItems.includes(item.metadata.tripadvisor.detailsUrl))
    } catch (err) {}
    let updateList = list.concat(unmergedItems)
    console.log('tripadvisor list gives', newList.length, 'records')
    return newList;

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