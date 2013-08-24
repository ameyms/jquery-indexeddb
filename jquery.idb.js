/**
* jquery.idb.js v0.0.1-dev by @ameyms
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
 * jquery-indexeddb: jquery.idb v0.0.1-dev
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

    var getDfd = function (extension, idbContext) {

        var promise  = $.Deferred(function(dfd) {

            this.idb = idbContext;
            $.extend(this, extension);

        });

        return promise;
    }


    /**
    * ======================================
    *  The actual IndexedDB class definition
    *
    * =======================================
    */
    var Idb = function () {

        this.__db__ = null;
    };

    /**
    *  Creates a store
    *  @param {string || Array} store Name of store or Array of Stores
    */
    Idb.prototype.createStores = function (stores, dfd) {

        console.log('Will now create store '+stores);
        var db = this.__db__;

        $.each(stores, function (i, s){

            if(db.objectStoreNames.contains(s.name)) {
                 db.deleteObjectStore(s.name);
            }

            var store = db.createObjectStore(s.name, {keyPath: s.keyPath});

        });

        dfd.resolveWith(this, [stores]);


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



    /**
    *  Opens the db
    *  @param {string} dbName Name of db
    *  @returns $.Deferred object composed of a promise and the {Idb} object
    */
    Idb.prototype.open = function (dbName, options) {

        var dbpromise = getDfd(DbPromise, this)
        ,   self = this
        ,   version = (options && options.version) || 1
        ,   request = indexedDB.open(dbName, version)
        ,   versionChanged = false;

        dbpromise.versioningPromise = $.Deferred();
        dbpromise.openingPromise = $.Deferred();

        console.log(request);
        request.onupgradeneeded = function (e) {

            versionChanged = true;
            self.__db__ = e.target.result;
            dbpromise.idb = self;
            e.target.transaction.onerror = function (err) {

                dbpromise.rejectWith(self, [err]);
            };

            dbpromise.versioningPromise.resolveWith(self,[{create:true}]);

        };

        request.onsuccess = function(e) {

            self.__db__ = e.target.result;
            dbpromise.idb = self;

            if(versionChanged === false) {

                dbpromise.versioningPromise.resolveWith(self,[{create:false}]);

            }
            dbpromise.openingPromise.resolveWith(self);
        };

        request.onerror = function (err) {

            dbpromise.rejectWith(self, [err]);
        }

        return dbpromise;
    };



    /**
    *   Promise resolution methods applicable while opening db
    */
    var DbPromise = {


        /**
        * Creates one or more new stores
        * This method should be called only ONCE.
        * If indexeddb version isnt upgraded, and list contains stores that 
        * don`t currently exists in db, the promise fails.
        *
        * @params stores {Array} list of stores to be created
        * @returns {$.Deferred} A deferred object
        */
        stores: function (stores) {

            var self = this
            ,   dfd = getDfd(StorePromise, this.idb)
            ,   creationDfd = $.Deferred()
            ,   openingDfd = $.Deferred()
            ,   storeExistanceDfd = $.Deferred()
            ,   absentStores = []
            ,   presentStores = [];

            this.versioningPromise.done(function (op) {

                if(op.create === true) {

                     this.createStores(stores,  creationDfd);
                }
                else {
                    creationDfd.resolve();
                }

            });

            this.openingPromise.done(function (){

                var idbContext = this;
               //Check if each of the stores exists
               $.each(stores, function (i, s) {

                    if(idbContext.hasStore(s.name)) {

                        presentStores.push(s.name);
                    }
                    else {

                        absentStores.push(s.name);
                    }

               });

               if (absentStores.length > 0) {
                    storeExistanceDfd.rejectWith(this, [{'present':presentStores, 'absent':absentStores}]);
                }
                else {
                    storeExistanceDfd.resolveWith(this);
                    
                }



            });

            $.when(creationDfd, openingDfd, storeExistanceDfd).then(function(){

                dfd.resolveWith(self.idb);

            },
            function(c, o, e) {

                dfd.rejectWith.call(dfd, self.idb, e);
            });

            return dfd;
        }


    };


    /**
    *   Promise resolution methods applicable on creating or
    *   `opening` an IndexedDB store.
    */
    var StorePromise = {


        /**
        * Adds or updates one or more items to the store
        * @param items {Array} array of items to be added
        * @param from {string} Name of store to which items are to be added
        */
        put: function (items, from) {

            var dfd = $.Deferred()
            ,   storename = from;

            console.log(this);
            if(this.state() === 'rejected') {

                dfd.reject();
            }

            this.done(function(){

                var objectsarr = $.isArray(items)?items:[items];
                doAdd.apply(this, $.merge([storename, dfd], objectsarr));

            });

            return dfd;
        },


        /**
        * Deletes objects from a given store
        * @param ids {Array} Array of ids of object that are to be deleted
        * @param from {string} Name of store
        */
        remove: function () {

        },

        destroy: function () {

        },

        select: function (from, condition, context) {

        },

        all: function () {


        }


    }


    $.extend({


        'idb' : function (db, options) {

            var idb = new Idb();
            return idb.open(db, options);
        }

    });


})(jQuery, window);