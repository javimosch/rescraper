module.exports = async function waitQuerySelectorAll(selector, page, bodyHandle, options = {}) {
    const cheerio = require('cheerio')
    return new Promise((resolve, reject) => {
        var startDate = Date.now()
        async function check() {
            html = await page.evaluate(body => body.innerHTML, bodyHandle)
            const $ = cheerio.load(html)
            let items = $(selector)
                .toArray()
            if (items.length !== 0) {
                resolve({ items, $ })
            } else {
                console.log('waitQuerySelectorAll iteraton....', selector, {
                    curr: Date.now() - startDate,
                    timeout: options.timeout || 20000
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