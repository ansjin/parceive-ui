####Databases
  The `loader` service can currently only operate on one database at a time. It is set globally and all requests are made to it. When changing the database the entire cache is invalidated.

####Types
  All database types are mapped to types in the `loader` service in order to make accessing relationships simpler. All functions that get data from the server store it as an `Instance` of a specific type.

**Properties**

  * properties: List of properties that are copied over from the servers response. If a property is not listed here it will not be available to user code.
  * plural: Name of the type in plural
  * singular: Name of the type in singular
  * relationships: explained below

**Relationships**

  All server defined relationships should be mapped for every type. This requires setting the relationships property on every type.

*Example*
  ```
relationships: {
  'call': {
    type: 'Call'
  },
  'instructions': {
    type: 'Instruction',
    many: true,
    inverse: 'segment'
  }
}
  ```

*Types of relationships*

  * belongsTo relationships only need the type of the other entity.
  * hasMany relationships require the many property to be true. The inverse is also required due to Pipelining.

*Convenience methods*

  In order to make the API simple it is required to add methods that request the relationships. Additionally some extra methods that go trough multiple levels of relationships can be defined.

####Caching

  Results from the server, both instances and relationships, are cached in the browser. This means that after getting some data all further requests to the same data will resolve immediately.

  User code should never assume that a instance or relationship is cached and act upon this information. The service should also make this as hard as possible to misuse. Currently this is achieved by using `Promises`, which are guaranteed to execute their callbacks asynchronously in all situations.

####Pipelining

  In order to drastically improve performance when requesting a large number of individual instances or relationships pipelining is used.

  This is done by delaying the first request by 10ms and queuing it and all further requests in those 10ms. When the time elapses a combined request is done to get all instances and relationships at the same time in order to reduce the load on the server.

  * Request to the same instance type can be combined in a single request.
  * Requests to the same relation on the same instance type can be combined to a single request. Here the `inverse` is required in order to separate the resulting array into the relationship for each instance.


  User code is unaware pipelining is done and the 10ms delay makes it very hard to notice during execution.

####Examples

All examples assume you have added the `loader` service as a dependency.

*Getting a single instace*

  Here we use the `getFunctionBySignature` filter to get a specific instance.

  ```
loader.getFunctionBySignature('main').then(function(fct) {
  ...
});
  ```

*Getting a relationship*
  ```
loader.getFunctionBySignature('main').then(function(fct) {
  return fct.getCalls();
}).then(function(calls) {
  ...
})
  ```
