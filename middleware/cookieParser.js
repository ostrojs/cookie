class CookieParser {
    constructor() {
        this.$cookie = this.$app['cookie'];
        if(this.$cookie instanceof require('../jar')){
            this.$registered = true;
            this.$cookieParser = this.$cookie.parse();

        }
    }
    handle({request,response, next} ) {
        if(!this.$registered){
            return next()
        }
        this.$cookieParser(request, response, next)
    }
}

module.exports = CookieParser