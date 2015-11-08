var url = require('url'),
    CLEARDB_DATABASE_URL = process.env.CLEARDB_DATABASE_URL || null;

if (CLEARDB_DATABASE_URL) {
    //parse url to get mysql connection params
    var parts = url.parse(CLEARDB_DATABASE_URL);

    module.exports = {
        db: {
            name: 'db',
            connector: 'loopback-connector-mysql',
            host: parts.host,
            port: 3306,
            database: parts.pathname.substring(1, parts.pathname.length),
            username: parts.auth.split(':')[0],
            password: parts.auth.split(':')[1]
        }
    };
} else {
    console.log('using memory db');
}