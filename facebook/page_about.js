const puppeteer = require('puppeteer')
const cheerio = require('cheerio')

module.exports = {
    scrapeItem
}

async function scrapeItem(url, item) {
    item.metadata = item.metadata || {}
    item.metadata.facebook = item.metadata.facebook || {}
    item.metadata.errors = item.metadata.errors || []
    const browser = await puppeteer.launch(require('../config').puppeteer)
    const page = await browser.newPage()
    await page.goto(url)
    const bodyHandle = await page.$('body')

    try {
        let { links, $ } = await waitEmailElements(page, bodyHandle, {
            timeout: 10000
        })
        let email = $(links[0]).attr('href').split('mailto:').join('')
        if (!!email) {
            item.email = email;
            item.metadata.facebook.email = email
        }
    } catch (err) {
        item.metadata.errors.push((err.stack || err.message).substring(0, 100))
    }

    return item
}

async function waitEmailElements(page, bodyHandle, options = {}) {
    return new Promise((resolve, reject) => {
        var startDate = Date.now()
        async function check() {
            html = await page.evaluate(body => body.innerHTML, bodyHandle)
            const $ = cheerio.load(html)
            let links = $('a')
                .toArray()
                .filter(link => {
                    return (
                        $(link)
                        .attr('href')
                        .indexOf('mailto') !== -1
                    )
                })
            if (links.length !== 0) {
                resolve({ links, $ })
            } else {
                console.log('facebook about email iteraton....', {
                    curr: Date.now() - startDate,
                    timeout: options.timeout
                })
                if (Date.now() - startDate > (options.timeout || 20000)) {
                    reject(new Error('TIMEOUT'))
                } else {

                    setTimeout(() => check(), 1000)
                }
            }
        }
        check()
    })
}