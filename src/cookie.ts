import ObjectGet from 'lodash.get';
import type { CookieOptions } from '@ostro/contracts/cookie/jar';

/**
 * Request cookie accessor and mutator facade.
 */
class Cookie {
    #cookies: Record<string, any>;
    #signedCookies: Record<string, any>;
    #request: any;
    #response: any;
    #jar: any;

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
        this.#jar = jar;
        this.#signedCookies = signedCookies;
        this.#request = request;
        this.#response = response;
        this.#cookies = cookies;
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
        const isSecure: boolean = typeof this.#request?.secure === 'function' ? this.#request.secure() : false;
        this.#response.append('Set-Cookie', this.#jar.createCookies(key, value, options, isSecure));
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
        return { ...this.#cookies, ...this.#signedCookies };
    }
}

export default Cookie;
