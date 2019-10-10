module.exports = {
    scrapeItem
}

async function scrapeItem(url, item = {}, options = {}) {
    item.metadata = item.metadata || {}
    item.metadata.errors = []
    item.metadata.tripadvisor = item.metadata.tripadvisor || {}
        // url ='https://www.tripadvisor.es/Restaurant_Review-g187147-d14971498-Reviews-Les_Loups_de_la_Butte-Paris_Ile_de_France.html'
    let sander = require('sander')
    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch(require('../config').puppeteer)
    const page = await browser.newPage()
        //if (options.debug) console.log('DETAILS goto url', url)
    await page.goto(url)
    const bodyHandle = await page.$('body')
    html = await page.evaluate(body => body.innerHTML, bodyHandle)
    await browser.close()
    const cheerio = require('cheerio')
    const $ = cheerio.load(html)
    try {
        let email = $('.ui_icon.email')
            .parent()
            .parent()
            .find('a')
            .attr('href')
            .split('mailto:')
            .join('')
        if (!email) {
            throw new Error('TRIPADVISOR_NO_EMAIL_DETECTED')
        } else {
            item.email = email
            item.metadata.tripadvisor.email = email
        }
    } catch (err) {
        item.metadata.errors.push((err.stack || err.message).substring(0, 200))
    }

    try {
        return await collectFacebookUrlAndProcess()
    } catch (err) {
        item.metadata.errors.push((err.stack || err.message).substring(0, 200))
        return item
    }

    async function collectFacebookUrlAndProcess() {
        // unable to get email from details view
        // 0pU_https://www.facebook.com/lesloupsdelabutte/_DcP
        var atob = require('atob')
        var links = $('.ui_link')
            .toArray()
            .map(link => {
                let encoded = $(link).attr('data-encoded-url')
                return (!!encoded && atob(encoded)) || null
            })
            .filter(url => !!url && url.indexOf('facebook') !== -1)
            .map(link => {
                return link.substring(link.indexOf('http'), link.lastIndexOf('/') + 1)
            })
            // about
        if (links.length === 0) {
            throw new Error('FACEBOOK_PAGE_URL_NO_DETECTED')
        } else {
            let url = links[0]
                // /about/?ref=page_internal
            if (url.indexOf('/about') !== -1) {
                url = url.split('/about')[0]
            }
            url = url + '/about/?ref=page_internal'
            url = url.split('https://').join('')
            url = url.split('http://').join('')
            url = url.split('//').join('/')
            url = 'https://' + url
                // console.log('URL', url)
            return await require('../facebook/page_about').scrapeItem(url, item)
        }
    }
}