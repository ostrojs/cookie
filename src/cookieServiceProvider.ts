import ServiceProvider from '@ostro/support/serviceProvider';
import CookieJar from './jar';

/**
 * Service provider binding the cookie jar singleton into the application container.
 */
class CookieServiceProvider extends ServiceProvider {
    declare $app: any;

    /**
     * Register cookie services into the container.
     */
    public register(): void {
        this.$app.singleton('cookie', function ($app: any): CookieJar {
            const $config: Record<string, any> = $app.instance('config').get('session');
            return new CookieJar($app, $config);
        });
    }

    /**
     * Boot cookie services.
     */
    public boot(): void {

    }
}

export default CookieServiceProvider;
