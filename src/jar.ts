import type { ICookieJar, CookieOptions } from '@ostro/contracts/cookie/jar';
import JarContract from '@ostro/contracts/cookie/jar';
import signature from 'cookie-signature';
import cookie from 'cookie';
import Cookie from './cookie';

/**
 * Cookie Jar managing creation, serialization, signing, and parsing of cookies.
 */
class Jar extends JarContract implements ICookieJar {
    #app: any;
    #config: Record<string, any>;

    /**
     * Create a new Cookie Jar instance.
     *
     * @param app - Application container instance.
     * @param config - Session/cookie configuration options.
     */
    constructor(app: any, config: Record<string, any> = {}) {
        super();
        this.#app = app;
        this.#config = Object.create(null);

        this.#config['path'] = config['path'] != undefined ? config['path'] : '/';
        this.#config['domain'] = config['domain'] != undefined ? config['domain'] : null;
        this.#config['secure'] = config['secure'] != undefined ? JSON.parse(config['secure']) : false;
        this.#config['httpOnly'] = config['http_only'] != undefined ? JSON.parse(config['http_only']) : true;
        this.#config['maxAge'] = config['lifetime'] != undefined ? parseInt(String(config['lifetime'] * 60), 10) : 0;
    }

    /**
     * Internal implementation to serialize and optionally sign a cookie.
     *
     * @param name - Cookie name.
     * @param value - Cookie value.
     * @param options - Serialization options.
     * @param isSecure - Whether connection is secure.
     * @returns Serialized cookie header string.
     */
    #createCookies(name: string, value: any, options: CookieOptions = {}, isSecure: boolean = false): string {
        const mergedOptions: Record<string, any> = {
            ...this.#config,
            ...options
        };
        if (!isSecure) {
            mergedOptions['secure'] = false;
        }
        if (mergedOptions['signed'] && !this.#app['config']['app']['key']) {
            throw new Error('cookieParser("secret") required for signed cookies');
        }

        let val: string = typeof value === 'object' ?
            'j:' + JSON.stringify(value) :
            String(value);

        if (mergedOptions['signed']) {
            val = 's:' + signature.sign(val, this.#app['config']['app']['key']);
        }

        return cookie.serialize(name, String(val), mergedOptions);
    }

    /**
     * Create and serialize a cookie header string.
     *
     * @param name - Cookie name.
     * @param value - Cookie value.
     * @param options - Serialization options.
     * @param isSecure - Whether HTTPS request.
     * @returns Serialized Set-Cookie string.
     */
    public createCookies(name: string, value: any, options: CookieOptions = {}, isSecure: boolean = false): string {
        return this.#createCookies(name, value, options, isSecure);
    }

    /**
     * Parse JSON prefixed cookies from a dictionary.
     *
     * @param cookies - Dictionary of cookies.
     * @param options - Parse options.
     * @returns Dictionary with deserialized JSON cookies.
     */
    public getJsonCookies(cookies: Record<string, any>, options: Record<string, any> = {}): Record<string, any> {
        return this.#jsonCookies(cookies, options);
    }

    /**
     * Parse a raw cookie header string into parsed cookies dictionary.
     *
     * @param cookies - Raw Cookie header string.
     * @param options - Parse options.
     * @returns Parsed cookie dictionary.
     */
    public getCookies(cookies: string = '', options: Record<string, any> = {}): Record<string, any> {
        return this.getJsonCookies(cookie.parse(cookies, options), options);
    }

    /**
     * Extract and unsign signed cookies using application key.
     *
     * @param cookies - Parsed raw cookies dictionary.
     * @param secrets - Key or array of secret keys.
     * @param options - Parse options.
     * @returns Unsigned cookies map.
     */
    public getSignedCookies(cookies: Record<string, any>, secrets: string | string[], options: Record<string, any> = {}): Record<string, any> {
        return secrets ? this.#signedCookies(cookies, secrets) : {};
    }

    /**
     * Create an Express/Connect style cookie parser middleware function.
     *
     * @param options - Parser options.
     * @returns Connect middleware handler.
     */
    public parse(options?: Record<string, any>): (req: any, res: any, next: (err?: any) => void) => void {
        const secrets: string | string[] = this.#app['config']['app']['key'];
        return (req: any, res: any, next: (err?: any) => void): void => {
            if (req.cookies) {
                return next();
            }
            const cookies: any = req.headers?.cookie;
            req.cookie = new Cookie(this, this.getCookies(cookies, options), this.getSignedCookies(cookies, secrets, options), req, res);
            res.cookie = function (...args: any[]): any {
                req.cookie.set(...args);
                return this;
            };
            next();
        };
    }

    /**
     * Parse a JSON cookie string prefixed with 'j:'.
     *
     * @param str - Cookie string.
     * @returns Deserialized value or undefined.
     */
    #jsonCookie(str: any): any {
        if (typeof str !== 'string' || str.slice(0, 2) !== 'j:') {
            return undefined;
        }

        try {
            return JSON.parse(str.slice(2));
        } catch {
            return undefined;
        }
    }

    /**
     * Mutate an object's keys, parsing any 'j:' values.
     *
     * @param obj - Cookies map.
     * @param _options - Unused parse options.
     * @returns Mutated object.
     */
    #jsonCookies(obj: Record<string, any> = Object.create(null), _options?: Record<string, any>): Record<string, any> {
        const cookies: string[] = Object.keys(obj);
        let key: string;
        let val: any;

        for (let i = 0; i < cookies.length; i++) {
            key = cookies[i];
            val = this.#jsonCookie(obj[key]);

            if (val) {
                obj[key] = val;
            }
        }

        return obj;
    }

    /**
     * Parse a signed cookie string prefixed with 's:'.
     *
     * @param str - Cookie string.
     * @param secret - Secret string or array of secrets.
     * @returns Unsigned string, false if tampered, or original string.
     */
    #signedCookie(str: any, secret: string | string[]): any {
        if (typeof str !== 'string') {
            return undefined;
        }

        if (str.slice(0, 2) !== 's:') {
            return str;
        }

        const secrets: string[] = !secret || Array.isArray(secret) ?
            ((secret as string[]) || []) : [secret];

        for (let i = 0; i < secrets.length; i++) {
            const val: string | false = signature.unsign(str.slice(2), secrets[i]);

            if (val !== false) {
                return val;
            }
        }

        return false;
    }

    /**
     * Extract all signed cookies from object, verifying signatures.
     *
     * @param obj - Cookie dictionary.
     * @param secret - App key secret.
     * @returns Verified signed cookies dictionary.
     */
    #signedCookies(obj: Record<string, any> = {}, secret: string | string[]): Record<string, any> {
        const cookies: string[] = Object.keys(obj);
        let dec: any;
        let key: string;
        const ret: Record<string, any> = Object.create(null);
        let val: any;

        for (let i = 0; i < cookies.length; i++) {
            key = cookies[i];
            val = obj[key];
            dec = this.#signedCookie(val, secret);

            if (val !== dec) {
                ret[key] = dec;
                delete obj[key];
            }
        }

        return ret;
    }
}

export default Jar;
