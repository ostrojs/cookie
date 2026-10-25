import { describe, test, expect } from "@jest/globals";
import CookieServiceProvider from '../src/cookieServiceProvider';
import Jar from '../src/jar';

describe('CookieServiceProvider Unit Tests', () => {

    test('register() binds cookie Jar singleton to container', () => {
        let boundKey = null;
        let factoryFn = null;

        const appMock = {
            singleton(key, fn) {
                boundKey = key;
                factoryFn = fn;
            }
        };

        const provider = new CookieServiceProvider(appMock);
        provider.register();

        expect(boundKey).toBe('cookie');
        expect(typeof factoryFn).toBe('function');

        const mockConfigInstance = {
            get(section) {
                expect(section).toBe('session');
                return {
                    path: '/',
                    domain: 'localhost',
                    secure: 'false',
                    http_only: 'true',
                    lifetime: 120
                };
            }
        };

        const resolvedAppMock = {
            instance(key) {
                expect(key).toBe('config');
                return mockConfigInstance;
            }
        };

        const jarInstance = factoryFn(resolvedAppMock);
        expect(jarInstance).toBeInstanceOf(Jar);

        // boot() method coverage
        expect(provider.boot()).toBeUndefined();
    });

});
