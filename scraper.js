// This is a template for a Node.js scraper on morph.io (https://morph.io)

var config = require('./hm.json')

var cheerio = require("cheerio");
var request = require("request");
var needle = require('needle');
var tress = require('tress');
var sqlite3 = require("sqlite3").verbose();


var q = tress(function(job, cb) {
  console.log('hello ' + job.name);
  fetchPage(job.url, function(err, data) {
    if (err) {
      cb(err);
    } else {
      processPage(data)
      cb(null, data);
    }
  });
}, 2);

q.drain = function() {
  console.log('all items have been processed');
  readRows(db);
  db.close();
};

var db

function initDatabase(callback) {
  // Set up sqlite database.
  db = new sqlite3.Database("data.sqlite");
  db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS data (name TEXT)");
    db.run("delete from data");
    callback(db);
  });
}

function fetchPage(url, cb) {
  // Use request to read in pages.
  needle.get(url, function(err, res) {
    if (err) {
      console.log("Error requesting page: " + err);
      cb(err)
      return;
    }

    cb(null, res.body);
  });
}

function readRows(db) {
  // Read some data.
  //db.each("SELECT rowid AS id, name FROM data", function(err, row) {
  //  console.log(row.id + ": " + row.name);
  //});
  db.each("SELECT count(*) AS c FROM data", function(err, row) {
    console.log( "Database count: " + row.c);
  });
}

function updateRow(value) {
  var json = JSON.stringify(value, 0, 2)
  // Insert some data.
  var statement = db.prepare("INSERT INTO data VALUES (?)");
  statement.run(json);
  statement.finalize();
}

function processPage(body) {
  // Use cheerio to find things in the page with css selectors.
  var $ = cheerio.load(body);

  var cat = $('nav.breadcrumbs ul').text().replace(/(\n|\t)+/g, '/').trim()
  var data = $("article.product-item").map(function(indx, el) {
    var $el = $(el)
    var res = {
      cat: cat,
      name: $el.find('a').text(),
      priceOld: $el.find('small').text().substring(1),
      price: $el.find('.product-item-price').text().trim().split('\n')[0].substring(1),
      image: $el.find('img').attr('data-image'),
      imageAlt: $el.find('img').attr('data-altimage'),
      url: $el.find('a').attr('href'), 
      percent : 0
    }
    if (+res.price && +res.priceOld) {
      res.percent = (100-+res.price/+res.priceOld*100).toFixed(0)
    }
    updateRow(res);
    return res
  })
}

function run(db) {
  q.push(config.urls) // Use request to read in pages.
}

initDatabase(run);
