module.exports = {
    puppeteer:{
        headless:  process.env.HEADLESS === '0' ? false : true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
}