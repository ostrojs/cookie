const ServiceProvider = require('@ostro/support/serviceProvider');
const CookieJar = require('./jar');
class filesystemServiceProvider extends ServiceProvider {
    register() {
        this.$app.singleton('cookie', function($app) {
            let $config = $app.instance('config').get('session');
            return new CookieJar($app, $config);
        })
    }

    boot() {

    }

}
module.exports = filesystemServiceProvider