import { describe, test, expect, beforeEach } from "@jest/globals";
import Cookie from '../src/cookie';

describe('Cookie Class Comprehensive Unit Tests', () => {

    let mockJar;
    let mockReq;
    let mockRes;
    let setHeaderCalls;
    let jarCreateCalls;

    beforeEach(() => {
        setHeaderCalls = [];
        jarCreateCalls = [];
        mockJar = {
            createCookies(key, value, options, isSecure) {
                jarCreateCalls.push({ key, value, options, isSecure });
                return `${key}=${value}; Path=${options.path || '/'}`;
            }
        };
        mockReq = {
            secure() {
                return true;
            }
        };
        mockRes = {
            append(header, val) {
                setHeaderCalls.push({ header, val });
            }
        };
    });

    test('constructor defines non-enumerable private symbols and sets cookies', () => {
        const cookies = { sess: 'abc' };
        const signed = { user: 'def' };
        const cookie = new Cookie(mockJar, cookies, signed, mockReq, mockRes);

        expect(typeof cookie).toBe('object');
        expect(cookie.all()).toEqual({ sess: 'abc', user: 'def' });
        expect(Object.keys(cookie.all())).toHaveLength(2);
    });

    test('all() combines unsigned and signed cookies with signed precedence', () => {
        const cookies = { session_id: '123', shared: 'unsigned' };
        const signedCookies = { user_id: '456', shared: 'signed' };
        const cookie = new Cookie(mockJar, cookies, signedCookies, mockReq, mockRes);

        const allCookies = cookie.all();
        expect(typeof allCookies).toBe('object');
        expect(Object.keys(allCookies)).toEqual(['session_id', 'shared', 'user_id']);
        expect(allCookies.shared).toBe('signed');
    });

    test('get() retrieves existing key or various default fallbacks', () => {
        const cookie = new Cookie(mockJar, { theme: 'dark', count: 42, active: true }, {}, mockReq, mockRes);

        expect(cookie.get('theme')).toBe('dark');
        expect(cookie.get('count')).toBe(42);
        expect(cookie.get('active')).toBe(true);
        expect(cookie.get('missing', 'light')).toBe('light');
        expect(cookie.get('missing_num', 0)).toBe(0);
        expect(cookie.get('missing_obj', { default: true })).toEqual({ default: true });
    });

    test('set() passes isSecure parameter correctly when req.secure() is callable or missing', () => {
        const cookieWithSecureReq = new Cookie(mockJar, {}, {}, mockReq, mockRes);
        cookieWithSecureReq.set('token', 'val1');
        expect(jarCreateCalls[0].isSecure).toBe(true);

        const cookieWithoutSecureFn = new Cookie(mockJar, {}, {}, {}, mockRes);
        cookieWithoutSecureFn.set('token', 'val2');
        expect(jarCreateCalls[1].isSecure).toBe(false);
    });

    test('set() appends Set-Cookie header to response and returns self for method chaining', () => {
        const cookie = new Cookie(mockJar, {}, {}, mockReq, mockRes);
        const chain = cookie.set('auth_token', 'token_val', { path: '/api', httpOnly: true });

        expect(chain).toBe(cookie);
        expect(setHeaderCalls).toHaveLength(1);
        expect(setHeaderCalls[0].header).toBe('Set-Cookie');
        expect(setHeaderCalls[0].val).toContain('auth_token=token_val');
        expect(jarCreateCalls[0].options).toEqual({ path: '/api', httpOnly: true });
    });

    test('clear() sets empty string value for targeted cookie key with options', () => {
        const cookie = new Cookie(mockJar, { remember: 'true' }, {}, mockReq, mockRes);
        cookie.clear('remember', { domain: 'example.com' });

        expect(setHeaderCalls).toHaveLength(1);
        expect(setHeaderCalls[0].val).toContain('remember=;');
        expect(jarCreateCalls[0].options.domain).toBe('example.com');

        cookie.clear('default_opts');
        expect(setHeaderCalls).toHaveLength(2);
    });

    test('forever() calculates maxAge 5 days in milliseconds', () => {
        const cookie = new Cookie(mockJar, {}, {}, mockReq, mockRes);
        cookie.forever('remember_me', 'abc123token');

        expect(setHeaderCalls).toHaveLength(1);
        expect(jarCreateCalls[0].options.maxAge).toBe(1000 * 60 * 60 * 24 * 5);
    });

});
