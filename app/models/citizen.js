'use strict';

var _ = require('underscore');
var request = require('request');
var json2csv = require('json2csv');
var fs = require('fs');
var def = require('../../node_modules/simply-deferred/deferred');

var URL_API = 'http://api.gbif.org/v1/occurrence/search?';

// Ranges
var years = [1995, 2014];

module.exports = {

  getCountries: function() {
    var countries_arr = [];

    var options = {
      uri: 'http://simbiotica.cartodb.com/api/v2/sql?q=SELECT iso3166a2 FROM countries_complete&api_key=0c09d0e4d56112e17c7fc613a54f18d37223ce7c',
      json: true
    };

    var promise = new def.Deferred();

    function x () {

      request(options, function(undefined, data){
        var countries = data.body.rows;

        _.each(countries, function(country) {
          countries_arr.push(country.iso3166a2);
        });

        promise.resolve(countries_arr);
      });

      return promise;
    }

    return x();
  },

  getByCountry: function(res) {

    var options = {}
    var p = []
    var arr_result = [];
    var urls = [];
    var basisOfRecord = ['HUMAN_OBSERVATION', 'OBSERVATION'];
    var self = this;



    def.when(this.getCountries().done(function(countries) {
      // Get URLS
      console.log('getting data..')

      for (var i = 0; i <= countries.length - 1; i++) {
        for (var index = 0; index <= basisOfRecord.length -1 ; index++) {
          for (var x = 0; x <= years.length - 1; x++) {
            urls.push(URL_API + 'year=' + years[x] + '&country=' + countries[i] + '&basisOfRecord=' + basisOfRecord[index] + '&TAXON_KEY=212&limit=1&datasetKey=4fa7b334-ce0d-4e88-aaae-2e0c138d049e');
          }
        }
      }

      // CALL
      def.when.apply(def, _.map(urls, function(url) {
        var p = new def.Deferred();

        var options = {
          uri: url,
          json: true
        };

        function x () {
          request(options, function (undefined, data) {
            p.resolve();

            var json = data.toJSON();
            var year = (_.isEmpty(data.body.results) ? 0 : data.body.results[0].year);
            var country = (_.isEmpty(data.body.results[0]) ? 0 : data.body.results[0].countryCode);
            var result = {
              year: year,
              country: country,
              count: json.body.count
            };

            arr_result.push(result);
          });

          return p;
        }

        return x();

      })).done(function(){
        console.log('done it');

        // JSON TO CSV
        var json = JSON.stringify(arr_result);
        json = JSON.parse(json);

        self.toCSV(json, res);
      });

    }));

  },

  getTotal: function(res) {

    var options = {}
    var p = []
    var arr_result = [];
    var urls = [];
    var self = this;


    def.when(this.getCountries()).done(function(countries) {
      // Get URLS
      console.log('getting data..')

      for (var i = 0; i <= countries.length - 1; i++) {
        for (var x = 0; x <= years.length - 1; x++) {
          urls.push(URL_API + 'year=' + years[x] + '&country=' + countries[i] + '&TAXON_KEY=212&limit=1');
        }
      }

      def.when.apply(def, _.map(urls, function(url) {

        var p = new def.Deferred();

        var options = {
          uri: url,
          json: true
        };

        function x () {
          request(options, function (undefined, data) {
            p.resolve();


            var json = data.body;
            var year = (_.isEmpty(data.body.results) ? 0 : data.body.results[0].year);
            var country = (_.isEmpty(data.body.results[0]) ? 0 : data.body.results[0].countryCode);
            var result = {
              year: year,
              country: country,
              count: json.count
            };

            arr_result.push(result);
          });

          return p;
        }

        return x();

      })).done(function(){
        console.log('done it');

        // JSON TO CSV
        var json = JSON.stringify(arr_result);
        json = JSON.parse(json);

        self.toCSV(json, res);
      });
    });
  },

  toCSV: function(json, res) {
    json2csv({ data: json, fields: ['year', 'country', 'count']}, function(err, csv) {
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    });
  }
}
