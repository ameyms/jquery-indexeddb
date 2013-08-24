/**
* jquery.idb.js v0.1.0-beta by @ameyms
* The MIT License (MIT)
* 
* Copyright (c) 2013 Amey Sakhadeo

* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

if (!jQuery) { throw new Error("jQuery Idb requires jQuery") }

/* ========================================================================
 * jquery-indexeddb: jquery.idb v0.1.0-beta
 * http://ameyms.github.com/jquery-indexeddb
 * ========================================================================
 *
 */

(function ($, window){

    var indexeddb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;

    /**
    * ==========================================
    * Private Methods
    * ==========================================
    */

    /**
    * Adds items to a store.
    * @param as store name
    * @param $.Deferred object
    * @param {Object...} items that need to be added
    * @context {Idb} idb
    */
    var doAdd = function () {

        var storename = arguments[0]
        ,   dfd = arguments[1]
        ,   items = Array.prototype.splice.call(arguments, 2)
        ,   db = this.__db__
        ,   self = this
        ,   addpromises = [];

        $.each(items, function(i, item){

            var trans = db.transaction([storename], "readwrite")
            ,   store = trans.objectStore(storename)
            ,   request = store.put(item)
            ,   p = $.Deferred();

            request.onsuccess = function(e) {
                p.resolveWith(self, [storename, item]);
            };

            request.onerror = function(err) {
                
                p.rejectWith(self, [storename, err.value, item]);
            };

            addpromises.push(p);

        });

        $.when.apply($, addpromises).then(function() {
            dfd.resolveWith(self, arguments)
        },
        function() {
            dfd.rejectWith(self, arguments)
        });
        
    };

    /**
    * Deletes object pointed to by the current cursor
    * This is always call in context of {Idb}
    */
    var deleteCursorObject = function (c) {

        var dfd = $.Deferred()
        ,   self = this
        ,   obj = c.value
        ,   delReq = c.delete();

        delReq.onsuccess = function () {

            dfd.resolveWith(self, [obj]);

        }

        delReq.onerror = function () {

            dfd.rejectWith(self, [obj]);
        }

        return dfd;

    };


    var getDfd = function (extension, idbContext) {

        var promise  = $.Deferred(function(dfd) {

            this.idb = idbContext;
            $.extend(this, extension);

        });

        return promise;
    }


    /**
    * ======================
    * CORE
    * ======================
    *
    * The actual IndexedDB class definition
    * This class encapsulates core IndexedDB functionality for
    * - Creating stores
    * - Add/ Delete/ Fetch objects
    * - In future: Handle events
    */
    var Idb = function () {

        this.__db__ = null;
    };

    /**
    *  Creates a store
    *  @param {Array} Array of Stores
    */
    Idb.prototype.createStores = function (stores, dfd) {

        var db = this.__db__;

        $.each(stores, function (i, s){

            if(db.objectStoreNames.contains(s.name)) {
                 db.deleteObjectStore(s.name);
            }

            var store = db.createObjectStore(s.name, {keyPath: s.keyPath});

        });


    }

    /**
    *  Deletes a store
    *  @param  stores {Array} Array of Stores
    */
    Idb.prototype.deleteStores = function (stores, dfd) {

        var db = this.__db__;

        $.each(stores, function (i, s){

            if(db.objectStoreNames.contains(s)) {
                 db.deleteObjectStore(s);
            }


        });


    }

    /**
    *  Checks if the store exists
    *  @param {string} storename Name of store
    */
    Idb.prototype.hasStore = function (storeName) {

        console.log('Checking for store '+storeName);
        var db = this.__db__;

        if(db.objectStoreNames.contains(storeName)) {
           return true;
        }
        else {

            return false;
        }
    }


    Idb.prototype.addObjects = doAdd;

    /**
    * Retrives objects from DB based on certain predicate
    */
    Idb.prototype.getObjects = function (storename, dfd, condition, context) {

        var self = this
        ,   db = this.__db__
        ,   trans = db.transaction([storename], "readwrite")
        ,   store = trans.objectStore(storename)
        ,   cursorRequest = store.openCursor()
        ,   resultSet = []
        ,   ctx = context || this;

        cursorRequest.onsuccess = function(e) {

            var result = e.target.result
            ,   accept = true;

            if(!!result == false || result === null) {
              dfd.resolveWith(self, [resultSet]);
              return;
            }

            if(condition) {
                accept = condition.call(ctx, result.key, result.value);
            }

            if(accept) {

                resultSet.push(result.value);
            }
            result.continue();

          };

          cursorRequest.onerror = function (err) {

            dfd.rejectWith(self, [err])
          }

    };

    /**
    * Deletes objects from DB based on certain condition
    */
    Idb.prototype.deleteObjects = function (storename, dfd, condition, context) {

        var self = this
        ,   db = this.__db__
        ,   trans = db.transaction([storename], "readwrite")
        ,   store = trans.objectStore(storename)
        ,   cursorRequest = store.openCursor()
        ,   resultSet = []
        ,   ctx = context || this
        ,   promises = [];

        cursorRequest.onsuccess = function(e) {

            var cursor = e.target.result
            ,   remove = true;

            if(!!cursor == false || cursor === null) {
             

                $.when.apply($, promises) 
                .then(function () {

                    //Hack to by-pass issue with single argument $.merge()
                    Array.prototype.push.call(arguments,[]);
                    dfd.resolveWith(self, $.merge.apply($, arguments));
                },
                function () {
                    Array.prototype.push.call(arguments,[]);
                    dfd.rejectWith(self, $.merge.apply($, arguments));

                });
                return;
            }

            if(condition) {
                remove = condition.call(ctx, cursor.key, cursor.value);
            }

            if(remove) {

                promises.push(deleteCursorObject.call(self, cursor));
            }
            cursor.continue();

          };

          cursorRequest.onerror = function (err) {

            dfd.rejectWith(self, [err])
          }

    };

    /**
    *  Opens the db, creates stores if requested
    *  @returns $.Deferred object composed of a promise and the {Idb} object
    */
    Idb.prototype.open = function (dbConfig) {

        var promise = getDfd(StorePromise, this)
        ,   dbName
        ,   stores = []
        ,   destroyStores = []
        ,   self = this
        ,   version = 1
        ,   absentStores = []
        ,   presentStores = []
        ,   notDropped = [];
        
        if($.type(dbConfig) === 'string') {

            dbName = dbConfig;

        }
        else {

            dbName = dbConfig.name;
            version = dbConfig.version;
            stores = dbConfig.stores || [];
            destroyStores = dbConfig.drop || [];

        }

        var request = indexedDB.open(dbName, version);

        request.onupgradeneeded = function (e) {

            self.__db__ = e.target.result;
            promise.idb = self;
            e.target.transaction.onerror = function (err) {

                promise.rejectWith(self, [err]);
            };

            if(destroyStores) {

                self.deleteStores(destroyStores);
            }
            
            if(stores) {

                self.createStores(stores);
            }

        };

        request.onsuccess = function(e) {

            self.__db__ = e.target.result;
            promise.idb = self;

            $.each(stores, function (i, s) {

                    if(self.hasStore(s.name)) {

                        presentStores.push(s.name);
                    }
                    else {

                        absentStores.push(s.name);
                    }

               });


            $.each(destroyStores, function (i, s) {

                if(self.hasStore(s)) {

                    notDropped.push(s);
                }

            });

           if (absentStores.length > 0 || notDropped.length > 0) {
                promise.rejectWith(self, [{'present':presentStores, 'absent':absentStores, 'dropFailed': notDropped}]);
            }
            else {
                promise.resolveWith(self);
                
            }            

        };

        request.onerror = function (err) {

            promise.rejectWith(self, [err]);
        }

        return promise;
    };



    /**
    * ==========================
    * INTERFACE
    * ==========================
    */

    /**
    * Promise resolution methods applicable on creating or
    * `opening` an IndexedDB store.
    * 
    * This class also acts as an interface to expose functionality 
    * to API users 
    */
    var StorePromise = {


        /**
        * Adds or updates one or more items to the store
        * @param items {Array} array of items to be added
        * @param into {string} Name of store to which items are to be added
        */
        put: function (items, into) {

            var dfd = $.Deferred()
            ,   storename = into;

            this.done(function(){

                var objectsarr = $.isArray(items)?items:[items];
                doAdd.apply(this, $.merge([storename, dfd], objectsarr));

            });

            this.fail(function (err) {

                dfd.rejectWith(this, [err]);
            });

            return dfd;
        },


        /**
        * Deletes objects from a given store based on a `condition` function
        * Optionally, `context` for the conidtion function may be provided
        * @param from {string} Name of store
        * @param condition {Function} A function that tests if object is to be deleted from objectstore
        * The function will be call with arguments (key, object)
        * @param context {Object} optional context to invoke condition function against
        */
        remove: function (from, condition, context) {
            
            var dfd = $.Deferred();

            this.done(function (){

                 this.deleteObjects(from, dfd, condition, context);

            });

            this.fail(function (err) {

                dfd.rejectWith(this, [err]);
            });

            return dfd;

        },


        /**
        * Deletes ALL objects from the store
        */
        clear: function (store) {

            return this.remove(store);
        },

        /**
        * Retrieves objects from store depending on a condition
        * @param from {string} name of store
        * @param condition {Function} A function that tests if object is to be retrieved from objectstore
        * The function will be call with arguments (key, object)
        * @param context {Object} optional context for the aforementioned function
        * @returns {$.Deferred} A deferred object
        */
        select: function (from, condition, context) {


            var self = this
            ,   dfd = $.Deferred();

            this.done(function (){

                this.getObjects(from, dfd, condition, context);

            });

            this.fail(function (err) {

                dfd.rejectWith(this, [err]);
            });

            return dfd;

        },

        all: function (from) {

            return this.select(from);
        }


    }


    /**
    * ==========================
    * jQuery Plugin Declaration
    * ===========================
    */
    $.extend({


        'idb' : function (db, options) {

            var idb = new Idb();
            return idb.open(db, options);
        }

    });


})(jQuery, window);