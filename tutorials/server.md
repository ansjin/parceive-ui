####Databases

The server expects the databases to be located in the `data` folder. These databases need to be converted before use. For more details see [database](tutorial-database.html).

####Organization

The server is started using `app.js` or by `gulp`. The server implementation resides in the `server` folder.

* [db.js](server.db.html) handles accesses to the databases. It opens and maintains multiple simultanious connections.
* [process.js](server.process.html) handles the conversion of databases
* [watch.js](server.watch.html) handles incoming databases that need to be converted.
* `entities.js` sets up the http server and uses the files in the `entities` folder in order to add all routes.
  * [util.js](server.util.html) contains the shared implementation for all urls that involve entities
  * `<entity>.js` contains the entity specific mapping and its routes

####Router

`entities.js` just sets up one route to get the list of available databases. All other routes are added from the files in the `entities folder`. Each entity exports 2 objects:

* A mapping
* A router

The router exposes all actions available for that entity and is added to the server in `entities.js`.

####Mappings

Mappings between database fields and api fields are needed for all tables. They reside in the `<entity>.js` files and keep a unified code convention in the javascript code for the client.
