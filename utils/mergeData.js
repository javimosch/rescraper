module.exports = function mergeData(self, savedData) {
    if (savedData === undefined) {
        return
    }
    Object.keys(self).forEach(k => {
        if (typeof self[k] === 'object' && !(self[k] instanceof Array)) {
            mergeData(self[k], savedData[k])
        } else {
            self[k] = savedData[k] || self[k]
        }
    })
    Object.keys(savedData)
        .filter(k => Object.keys(self).indexOf(k) == -1)
        .forEach(newK => {
            self[newK] = savedData[newK]
        })
}