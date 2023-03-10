/**
 *   simple class which generates getters and setters for properties
 */
var Bean = function(simpleObject) {
    var properties = [];
    for (var property in simpleObject) {
        if (typeof simpleObject[property] !== 'function') {
            properties.push(property);
        }
    }

    properties.forEach(function(property) {
        var prefix;
        if (typeof simpleObject[property] === 'boolean') {
            prefix = 'is';
        } else {
            prefix = 'get';
        }

        simpleObject[prefix + property.substring(0, 1).toUpperCase() + property.substring(1, property.length)] = function() {
            return simpleObject[property];
        };

        simpleObject['set' + property.substring(0, 1).toUpperCase() + property.substring(1, property.length)] = function(value) {
            simpleObject[property] = value;
        };
    });

    return simpleObject;
};

/**
 * Walk the given directory synchronously and return the files
 *
 * @param  {String} dir      The directory to walk
 * @param  {Array}  filelist Leave empty on first call, used for recursion
 *
 * @return {Array}          The files (full paths)
 */
var walkSync = function(dir, filelist) {
  var fs = fs || require('fs'),
      files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walkSync(dir + '/' + file, filelist);
    }
    else {
      filelist.push(dir + '/' + file);
    }
  });
  return filelist;
};

var path = require('path');
// walk the dw/* directory and add create dw.* globals by requiring the found stuff
walkSync(__dirname).forEach(function(file){
    var classPath = path.relative(__dirname,file).replace('.js','');
    var pathArray = classPath.split(path.sep);
    if(pathArray.length == 3 && pathArray[0] == 'dw'){
        var obj = global;
        pathArray.forEach(function(pathElem){
            //console.log(pathElem);
            if(!obj[pathElem]){
                obj[pathElem] = {};
            }
            obj = obj[pathElem];
        });
        try{
            global[pathArray[0]][pathArray[1]][pathArray[2]] = require("./"+classPath);
        }catch(e){
            console.log("Could not require "+classPath+e);
        }
    }
});

global.empty = function(obj) {
    if (obj === null || obj === undefined || obj === '' || (typeof (obj) !== 'function' && obj.length !== undefined && obj.length === 0)) {
        return true;
    } else {
        return false;
    }
};

global.Fault = function() {};

global.response = new dw.system.Response();
global.session = new dw.system.Session();

global.request = {
    httpParameterMap: {
        initializeQueryString: function(queryString) {
            var keyValuePairs = queryString.split('&');
            for (var i = 0; i < keyValuePairs.length; i++) {
                this.setParameter(keyValuePairs[i]);
            }
        },

        /**
        * Returns a sub-map containing all parameters that start with the given prefix.
        */
        getParameterMap: function(prefix) {
            var result = [];
            for (var key in this) {
                if (key.indexOf(prefix) === 0) {
                    result.push(this[key]);
                }
            }

            return result;
        },

        setNonSubmittedKeys: function(keys) {
            var i;
            var key;
            for (i = 0; i < keys.length; i++) {
                key = keys[i];
                this[key] = new Bean({
                    value: null,
                    stringValue: null,
                    intValue: null,
                    doubleValue: null,
                    submitted: false
                });
            }
        },

        setParameter: function(keyValuePair) {
            if (keyValuePair.indexOf('=') > 0) {
                var key = keyValuePair.split('=')[0];
                var value = keyValuePair.split('=').slice(1).join('=');
                this[key] = new Bean({
                    value: value,
                    intValue: parseInt(value),
                    doubleValue: parseFloat(value),
                    stringValue: value,
                    submitted: true,
                    booleanValue: value === 'true' ? true : false
                });
            } else {
                throw 'Invalid Querystring';
            }
        },

        destroyParameters: function() {
            for (var key in this) {
                if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
                    delete this[key];
                }
            }
        },

        get: function(key) {
            return this[key] || new Bean({
                    value: "",
                    intValue: 0,
                    doubleValue: 0,
                    stringValue: "",
                    submitted: false
                });
        },

        isParameterSubmitted: function(key) {
            return this.get(key).submitted;
        }
    },
    httpSecure: true,
    httpUserAgent: '',
    isHttpSecure: function() {
        return true;
    },
    custom: {}
};
global.request.prototype = dw.system.Request;

global.customer = new dw.customer.Customer();

global.XML = function(obj) {
    // allow construction with plain objects to simulate simple XML cases (i.e. without namespaces)
    if (obj && typeof (obj) === 'object') {
        for (var i in obj) {
            this[i] = obj[i];
        }

        return this;
    }

    return {};
};

global.XML.prototype.toXMLString = function() {
    return 'NOT IMPLEMENTED';
};

global.String.prototype.equals = function(object) {
    return (typeof object === 'string') && object === this.valueOf();
};

global.PIPELET_NEXT = 1;
global.PIPELET_ERROR = 0;

// add root as module lookup location so that require("dw/*") will work
require('app-module-path').addPath(__dirname + '/');
