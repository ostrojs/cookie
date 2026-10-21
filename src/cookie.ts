import ObjectGet from 'lodash.get';
import type { CookieOptions } from '@ostro/contracts/cookie/jar';

const kCookies: unique symbol = Symbol('cookies');
const kSignedCookies: unique symbol = Symbol('signedCookies');
const kRequest: unique symbol = Symbol('request');
const kResponse: unique symbol = Symbol('response');
const kJar: unique symbol = Symbol('jar');

/**
 * Request cookie accessor and mutator facade.
 */
class Cookie {
    [kCookies]: Record<string, any>;
    [kSignedCookies]!: Record<string, any>;
    [kRequest]!: any;
    [kResponse]!: any;
    [kJar]!: any;

    /**
     * Create a new Cookie interaction instance.
     *
     * @param jar - Cookie jar instance.
     * @param cookies - Parsed unsigned cookies dictionary.
     * @param signedCookies - Parsed signed cookies dictionary.
     * @param request - Incoming HTTP request.
     * @param response - Outgoing HTTP response.
     */
    constructor(jar: any, cookies: Record<string, any>, signedCookies: Record<string, any>, request: any, response: any) {
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
        });
        this[kCookies] = cookies;
    }

    /**
     * Retrieve a cookie by key with an optional fallback.
     *
     * @typeParam T - Expected return type.
     * @param key - Cookie name.
     * @param defaultValue - Fallback value if cookie not present.
     * @returns Resolved cookie value.
     */
    get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
        return ObjectGet(this.all(), key, defaultValue);
    }

    /**
     * Set a response cookie.
     *
     * @param key - Cookie name.
     * @param value - Cookie value.
     * @param options - Cookie options (domain, path, maxAge, secure, etc.).
     * @returns Fluent self instance.
     */
    set(key: string, value: any, options: CookieOptions = {}): this {
        const isSecure: boolean = typeof this[kRequest]?.secure === 'function' ? this[kRequest].secure() : false;
        this[kResponse].append('Set-Cookie', this[kJar].createCookies(key, value, options, isSecure));
        return this;
    }

    /**
     * Clear a response cookie by setting an empty value.
     *
     * @param key - Cookie name.
     * @param options - Cookie options.
     * @returns Fluent self instance.
     */
    public clear(key: string, options: CookieOptions = {}): this {
        return this.set(key, '', options);
    }

    /**
     * Set a cookie that lasts indefinitely (5 days standard).
     *
     * @param key - Cookie name.
     * @param value - Cookie value.
     */
    public forever(key: string, value: any): void {
        this.set(key, value, { maxAge: 1000 * 60 * 60 * 24 * 5 });
    }

    /**
     * Get all cookies merged (unsigned and signed).
     *
     * @returns Combined cookies dictionary.
     */
    public all(): Record<string, any> {
        return { ...this[kCookies], ...this[kSignedCookies] };
    }
}

export default Cookie;
