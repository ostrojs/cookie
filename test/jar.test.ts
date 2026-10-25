import { describe, test, expect, beforeEach } from "@jest/globals";
import Jar from '../src/jar';
import signature from 'cookie-signature';

describe('Cookie Jar Comprehensive Unit Tests', () => {

    let appMock;
    let config;
    let jar;

    beforeEach(() => {
        config = {
            path: '/api',
            domain: 'example.com',
            secure: 'true',
            http_only: 'true',
            lifetime: 60
        };
        appMock = {
            config: {
                app: {
                    key: 'secret-app-key-123'
                }
            }
        };
        jar = new Jar(appMock, config);
    });

    describe('Initialization & Option Defaults', () => {
        test('Jar initializes configuration with proper type conversions and defaults', () => {
            expect(jar).toBeInstanceOf(Jar);

            const defaultJar = new Jar(appMock, {});
            expect(defaultJar).toBeDefined();
        });
    });

    describe('Cookie Serialization & Signatures', () => {
        test('createCookies() serializes plain and JSON cookies with options', () => {
            const plainCookie = jar.createCookies('test_cookie', 'plain_val', {}, true);
            expect(typeof plainCookie).toBe('string');
            expect(plainCookie).toContain('test_cookie=plain_val');
            expect(plainCookie).toContain('Path=/api');
            expect(plainCookie).toContain('Domain=example.com');
            expect(plainCookie).toContain('Secure');

            const jsonCookie = jar.createCookies('json_cookie', { user: 'amar', role: 'admin' });
            expect(jsonCookie).toContain('json_cookie=j%3A%7B%22user%22%3A%22amar%22%2C%22role%22%3A%22admin%22%7D');
        });

        test('createCookies() creates signed cookies when signed option is true', () => {
            const signedCookie = jar.createCookies('signed_name', 'signed_val', { signed: true });
            expect(signedCookie).toContain('signed_name=s%3A');
        });

        test('createCookies() throws error if signed cookie created without app key', () => {
            const invalidApp = { config: { app: { key: null } } };
            const invalidJar = new Jar(invalidApp, config);
            expect(() => invalidJar.createCookies('s', 'v', { signed: true })).toThrow(
                'cookieParser("secret") required for signed cookies'
            );
        });
    });

    describe('Parsing & Deserialization Mechanics', () => {
        test('getCookies() and getJsonCookies() parse incoming cookie strings and handles malformed JSON', () => {
            const cookieHeader = 'user=amar; valid_json=j%3A%7B%22theme%22%3A%22dark%22%7D; bad_json=j%3A%7Bmalformed; plain=hello';
            const parsed = jar.getCookies(cookieHeader);

            expect(typeof parsed).toBe('object');
            expect(parsed.user).toBe('amar');
            expect(parsed.valid_json).toEqual({ theme: 'dark' });
            expect(parsed.bad_json).toBe('j:{malformed');
            expect(parsed.plain).toBe('hello');
        });

        test('getSignedCookies() verifies signed cookie signatures with string or array of secrets', () => {
            const signedValOld = 's:' + signature.sign('old-secret-data', 'old-key-456');
            const signedValNew = 's:' + signature.sign('new-secret-data', 'secret-app-key-123');
            const badSigVal = 's:invalid_signature_data';
            const rawCookies = {
                old_key: signedValOld,
                new_key: signedValNew,
                bad_sig: badSigVal,
                plain_cookie: 'regular_val',
                num_val: 123
            };

            const signed = jar.getSignedCookies(rawCookies, ['secret-app-key-123', 'old-key-456']);
            expect(typeof signed).toBe('object');
            expect(signed.old_key).toBe('old-secret-data');
            expect(signed.new_key).toBe('new-secret-data');
            expect(signed.bad_sig).toBe(false);
            expect(signed.plain_cookie).toBeUndefined();
            expect(signed.num_val).toBeUndefined();

            // When no secret is passed
            const emptySigned = jar.getSignedCookies(rawCookies, null);
            expect(emptySigned).toEqual({});
        });
    });

    describe('Middleware Integration', () => {
        test('parse() middleware populates req.cookie and res.cookie', () => {
            const middleware = jar.parse();
            expect(typeof middleware).toBe('function');

            const req = { headers: { cookie: 'session=xyz' } };
            const res = {
                append() {}
            };
            let nextCalled = false;

            middleware(req, res, () => {
                nextCalled = true;
            });

            expect(nextCalled).toBe(true);
            expect(req.cookie).toBeDefined();
            expect(typeof res.cookie).toBe('function');

            res.cookie('new_cookie', 'new_val');
        });

        test('parse() middleware immediately calls next() if req.cookies is already present', () => {
            const middleware = jar.parse();
            const req = { cookies: { existing: true } };
            let nextCalled = false;

            middleware(req, {}, () => {
                nextCalled = true;
            });

            expect(nextCalled).toBe(true);
        });
    });

});
