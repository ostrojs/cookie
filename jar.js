require('@ostro/support/helpers')
var signature = require('cookie-signature');
var cookie = require('cookie');
const JarContract = require('@ostro/contracts/cookie/jar')
const kCreateCookies = Symbol('createCookies')
const kJSONCookies = Symbol('jSONCookies')
const kJSONCookie = Symbol('jSONCookie')
const kSignedCookies = Symbol('signedCookies')
const kSignedCookie = Symbol('signedCookie')
const kApp = Symbol('app')
const kConfig = Symbol('config')
const Cookie = require('./cookie')
const { luxon, moments } = require('@ostro/support/function')
class Jar extends JarContract {
    constructor(app, config) {
        super()
        Object.defineProperty(this, kApp, {
            value: app,
            writable: false,
            configurable: false,
            enumerable: false
        })
        this[kConfig] = Object.create(null)

        this[kConfig]['path'] = config['path'] != undefined ? config['path'] : '/';
        this[kConfig]['domain'] = config['domain'] != undefined ? config['domain'] : null;
        this[kConfig]['secure'] = config['secure'] != undefined ? JSON.parse(config['secure']) : false;
        this[kConfig]['httpOnly'] = config['http_only'] != undefined ? JSON.parse(config['http_only']) : true;
        this[kConfig]['maxAge'] = config['lifetime'] != undefined ? parseInt(config['lifetime'] * 60) : 0;
    }

    [kCreateCookies](name, value, options = {}, isSecure = false) {
        options = { ...this[kConfig],
            ...options
        }
        if (!isSecure) {
            options.secure = false
        }
        if (options.signed && !this[kApp]['config']['app']['key']) {
            throw new Error('cookieParser("secret") required for signed cookies');
        }

        var val = typeof value === 'object' ?
            'j:' + JSON.stringify(value) :
            String(value);

        if (options.signed) {
            val = 's:' + signature.sign(val, this[kApp]['config']['app']['key']);
        }

        return cookie.serialize(name, String(val), options)
    }

    createCookies(name, value, options = {}, isSecure = false) {
        return this[kCreateCookies](name, value, options, isSecure);
    }
    getJsonCookies(cookies, options = {}) {
        return this[kJSONCookies](cookies, options)
    }
    getCookies(cookies = '', options = {}) {
        return this.getJsonCookies(cookie.parse(cookies, options), options)
    }
    getSignedCookies(cookies, secrets, options = {}) {
        return secrets ? this[kSignedCookies](cookies, secrets) : {}
    }
    parse(options) {

        var secrets = this[kApp]['config']['app']['key']
        return (req, res, next) => {

            if (req.cookies) {
                return next()
            }
            var cookies = req.headers.cookie
            req.cookie = new Cookie(this, this.getCookies(cookies, options), this.getSignedCookies(cookies, secrets, options), req, res)
            res.cookie = function() {
                req.cookie.set(...arguments)
                return this
            }
            next()
        }
    }

    [kJSONCookie](str) {
        if (typeof str !== 'string' || str.substr(0, 2) !== 'j:') {
            return undefined
        }

        try {
            return JSON.parse(str.slice(2))
        } catch (err) {
            return undefined
        }
    }

    [kJSONCookies](obj = Object.create(null)) {
        var cookies = Object.keys(obj)
        var key
        var val

        for (var i = 0; i < cookies.length; i++) {
            key = cookies[i]
            val = this[kJSONCookie](obj[key])

            if (val) {
                obj[key] = val
            }
        }

        return obj
    }

    [kSignedCookie](str, secret) {
        if (typeof str !== 'string') {
            return undefined
        }

        if (str.substr(0, 2) !== 's:') {
            return str
        }

        var secrets = !secret || Array.isArray(secret) ?
            (secret || []) : [secret]

        for (var i = 0; i < secrets.length; i++) {
            var val = signature.unsign(str.slice(2), secrets[i])

            if (val !== false) {
                return val
            }
        }

        return false
    }

    [kSignedCookies](obj = {}, secret) {
        var cookies = Object.keys(obj)
        var dec
        var key
        var ret = Object.create(null)
        var val

        for (var i = 0; i < cookies.length; i++) {
            key = cookies[i]
            val = obj[key]
            dec = this[kSignedCookie](val, secret)

            if (val !== dec) {
                ret[key] = dec
                delete obj[key]
            }
        }

        return ret
    }
}
module.exports = Jar