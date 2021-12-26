const ObjectGet = require('lodash.get')
const kCookies = Symbol('cookies')
const kSignedCookies = Symbol('signedCookies')
const kRequest = Symbol('request')
const kResponse = Symbol('response')
const kJar = Symbol('jar')

class Cookie {

    constructor(jar, cookies, signedCookies, request, response) {
        Object.defineProperties(this, {
            [kJar]: {
                value: jar
            },
            [kSignedCookies]: {
                value: signedCookies
            },
            [kRequest]: {
                value: request,
            },
            [kResponse]: {
                value: response
            }
        })
        this[kCookies] = cookies;
    }

    get(key, defaultValue = null) {
        return ObjectGet(this.all(), key, defaultValue);
    }

    set(key, value, options = {}) {
        this[kResponse].append('Set-Cookie', this[kJar].createCookies(key, value, options, this[kRequest].secure()));
        return this
    }

    clear(key, options = {}) {
        return this.set(key, '', options);
    }

    forever(key, value) {
        this.set(key, value, { maxAge: 1000 * 60 * 60 * 24 * 5 })
    }

    all() {
        return { ...this[kCookies], ...this[kSignedCookies] }
    }

}
module.exports = Cookie