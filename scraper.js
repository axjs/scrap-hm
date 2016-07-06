// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (name TEXT)");
		db.run("truncate data");
		callback(db);
	});
}

function updateRow(db, value) {
	// Insert some data.
	var statement = db.prepare("INSERT INTO data VALUES (?)");
	statement.run(value);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, name FROM data", function(err, row) {
		console.log(row.id + ": " + row.name);
	});
}

function fetchPage(url, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

function run(db) {
	// Use request to read in pages.
	fetchPage("http://www2.hm.com/en_gb/sale/kids/viewall.html?product-type=kids_all&sort=stock&offset=0&page-size=100", function (body) {
		// Use cheerio to find things in the page with css selectors.
		var $ = cheerio.load(body);

		//var elements = $("article.product-item h3.product-item-headline a").each(function () {
		//	var value = $(this).text().trim();
		//	updateRow(db, value);
		//});
		var data = $("article.product-item").map(function(indx, el){
      			var $el = $(el)
      			var res = {
        			name: $el.find('a').text(), 
        			oldPrice: $el.find('small').text(), 
        			price: $el.find('.product-item-price').text().trim(), 
        			image: $el.find('img').attr('data-image')
      			} 
      			updateRow(db, JSON.stringify(res));
      			return res
		})
		
		readRows(db);

		db.close();
	});
}

initDatabase(run);
