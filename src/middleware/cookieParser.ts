import Jar from '../jar';

/**
 * CookieParser middleware for parsing incoming cookies and attaching cookie helper to response.
 */
class CookieParser {
    declare $app: any;
    public $cookie: any;
    $registered?: boolean;
    $cookieParser?: (req: any, res: any, next: (err?: any) => void) => void;

    /**
     * Create a new CookieParser middleware instance.
     */
    constructor() {
        this.$cookie = (this as { $app?: { cookie?: unknown } }).$app?.cookie;
        if (this.$cookie instanceof Jar) {
            this.$registered = true;
            this.$cookieParser = this.$cookie.parse();
        }
    }

    /**
     * Handle an incoming HTTP request.
     *
     * @param context - Request context containing request, response, and next function.
     * @param context.request - Incoming HTTP request.
     * @param context.response - Outgoing HTTP response.
     * @param context.next - Next middleware callback.
     */
    handle({ request, response, next }: { request: any; response: any; next: (err?: any) => void }): void {
        if (!this.$registered) {
            return next();
        }
        this.$cookieParser!(request, response, next);
    }
}

export default CookieParser;
