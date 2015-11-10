var url = require('url'),
    CLEARDB_DATABASE_URL = process.env.CLEARDB_DATABASE_URL || process.env.npm_package_config_db;

if (CLEARDB_DATABASE_URL) {
    //parse url to get mysql connection params
    var parts = url.parse(CLEARDB_DATABASE_URL),
      db = {
        name: 'db',
          connector: 'loopback-connector-mysql',
          host: parts.host,
          port: 3306,
          database: parts.pathname.substring(1, parts.pathname.length),
          username: parts.auth.split(':')[0],
          password: parts.auth.split(':')[1]
      };

    module.exports = {
        db: db
    };
} else {
    console.log('using memory db');
}
