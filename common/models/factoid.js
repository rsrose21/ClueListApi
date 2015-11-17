'use strict';

var speak = require("speakeasy-nlp"),
    charLimit = 140;

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
                                text: rows[i].description
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
