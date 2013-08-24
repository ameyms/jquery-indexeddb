IndexedDB Plugin for JQuery
===========================


*Warning! This is not at all production ready!*


Why A JQuery Plugin
---

* ### Complexity is Bad
The IndexedDB as a technology is awesome but the JavaScript API is really 
[ugly and daunting](http://www.html5rocks.com/en/tutorials/indexeddb/todo/ "Heres why"). 
This could be 'ok' for any other language, but not Javascript.
So heres an abstraction library that JS developers need. And deserve.

* ###  Callbacks are Ugly
The API heavily relies on arcane callbacks which lead to horrible, repetitive spaghetti code. 
Modern JS APIs need to use promises.

* ### Abstraction is Good
  Ideally, this how IndexedDB should work
  ```javascript

  	//Define and initialize an IndexedDB ...
	var db = $.idb({
						name:'foobar', 
						version: 2,
						drop: stores_to_be_deleted,
						stores:list_of_stores
					});

	// ... Add items to a store
	db.put(items, 'into_store').done(onsuccess);

	//.. And delete items from a store
	db.remove('from_store', conditionFunc).done(onremoval);

  ```
Just the right amount of abstraction, Promises using `$.Deferred` would make this API 
as beautiful and as joyful to use as it should've been.


License
---
This library will available under the 
[MIT license](https://github.com/ameyms/jquery-indexeddb/blob/master/LICENSE "License")


