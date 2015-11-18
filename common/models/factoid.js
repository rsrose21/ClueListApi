'use strict';

var speak = require("speakeasy-nlp"),
  //create regexp cached object for URL stripping from results
  urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$',
  url = new RegExp(urlRegex, 'gi'),
  //create regexp cached object for stripping Twitter hashtags
  hashRegex = new RegExp('[#]+[A-Za-z0-9-_]+', 'gi'),
  userRegex = new RegExp('[@]+[A-Za-z0-9-_]+', 'gi'),
  anchorRegex = new RegExp('[<a[^>]*>(.*?)</a>]+', 'gi');

function analyze(terms, cb) {
    console.log('analyze', terms);
    // Analyze sentences at a basic level
    // ------------------------------------- //
    var words = speak.classify(terms);
    console.log(words);
    switch (true) {
        case (words.subject):
            cb(words.subject);
            break;
        case (words.action):
            cb(words.action);
            break;
        case (Array.isArray(words.nouns) && words.nouns.length > 0):
            cb(words.nouns);
            break;
        default:
            cb(words.tokens);
    }
}

function formatTerms(terms) {
    if (Array.isArray(terms) && terms.length > 0) {
        return terms.join('* ') + '*';
    } else {
        return terms + '*';
    }
}

String.prototype.stripURL = function() {
  return this.replace(url, '');
};

String.prototype.stripUsername = function() {
  return this.replace(userRegex, '');
};

String.prototype.stripHashtag = function() {
  return this.replace(hashRegex, '');
};

String.prototype.stripAnchorTag = function() {
  return this.replace(anchorRegex, '');
};

//strip factoids of urls, twitter usernames and hashtags
function clean(str) {
  return str.stripURL().stripUsername().stripHashtag().stripAnchorTag();
}

module.exports = function(Factoid) {
    Factoid.search = function(terms, cb) {
        var data = {
            error: '',
            items: [],
            clue: '',
            total_items: 0,
            total_pages: 0,
            current_page: 1
        };

        var mySQLDataSource = Factoid.getDataSource();
        var mySQLPool = mySQLDataSource.connector.client;
        analyze(terms, function(words) {
            var sql = "SELECT *, MATCH(description) AGAINST ('" + formatTerms(words) + "' IN BOOLEAN MODE) AS relevance FROM `factoid` WHERE MATCH(description) AGAINST ('" + formatTerms(words) + "' IN BOOLEAN MODE) ORDER BY RAND()";
            console.log(sql);
            mySQLPool.query(sql, function(err, rows, fields) {
                var item;

                if (err || !Array.isArray(rows)) {
                  data.error = err;
                  cb(null, data);
                }

                console.log('Found ' + rows.length + ' results');

                if (rows.length !== 0){
                    if (Array.isArray(words)) {
                        data.clue = words.join(' ');
                    } else {
                        data.clue = words;
                    }
                    for (var i = 0; i < rows.length; i += 1) {
                        if (data.total_items < 25) {
                            item = {
                                id: rows[i].id,
                                text: clean(rows[i].description)
                            };
                            //add factoid to array to return
                            data.items.push(item);
                            data.total_items += 1;
                        } else {
                            //we have enough responses to return, break loop early
                            continue;
                        }
                    }
                    data.total_items = rows.length;
                    cb(null, data);
                } else{
                    data.error = 'No results Found..';
                    cb(null, data);
                }
            });
        });
    };

    Factoid.remoteMethod(
        'search',
        {
            http: {path: '/search', verb: 'get'},
            accepts: {arg: 'terms', type: 'string', http: {source: 'query'}},
            returns: {arg: 'results', type: 'string'}
        }
    );
};
