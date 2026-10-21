import CookieParser from '../src/middleware/cookieParser';
import Jar from '../src/jar';

describe('CookieParser Middleware Unit Tests', () => {

    let mockJar;

    beforeEach(() => {
        mockJar = Object.create(Jar.prototype);
        mockJar.parse = function() {
            return function(req, res, next) {
                req.parsedCookie = true;
                next();
            };
        };
    });

    test('CookieParser registers parser when app cookie is instance of Jar', () => {
        CookieParser.prototype.$app = {
            cookie: mockJar
        };

        const parser = new CookieParser();
        expect(parser.$registered).toBe(true);

        let nextCalled = false;
        const req = {};
        const res = {};
        const next = () => { nextCalled = true; };

        parser.handle({ request: req, response: res, next });

        expect(req.parsedCookie).toBe(true);
        expect(nextCalled).toBe(true);
    });

    test('CookieParser bypasses when cookie jar is not registered', () => {
        CookieParser.prototype.$app = {
            cookie: {}
        };

        const parser = new CookieParser();
        expect(parser.$registered).toBeUndefined();

        let nextCalled = false;
        parser.handle({ request: {}, response: {}, next: () => { nextCalled = true; } });

        expect(nextCalled).toBe(true);
    });

});
