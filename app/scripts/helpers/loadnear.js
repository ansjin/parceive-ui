angular.module('app')
  .service('LoadNeighboursService', ['LoaderService', function(loader) {
    return function(data) {
      var ret = _.clone(data);

      function addToRet(type, item) {
        ret.push({
          type: type,
          id: item.id,
          neighbour: true
        });
      }

      function addAllToRet(type, items) {
        _.forEach(items, function(item) {
          addToRet(type, item.id);
        });
      }

      return RSVP.all(_.map(data, function(element) {
        switch (element.type) {
          case 'Call':
            return loader.getCall(element.id).then(function(call) {
              return RSVP.all([
                call.getParent().then(_.partial(addToRet, 'Call')),
                call.getCalls().then(_.partial(addAllToRet, 'Call')),
                call.getCallGroup().then(_.partial(addToRet, 'CallGroup')),
                call.getCallGroups().then(_.partial(addAllToRet, 'CallGroup')),
                call.getReferences().then(_.partial(addAllToRet, 'Reference'))
              ]);
            });
          case 'CallGroup':
            return loader.getCallGroup(element.id).then(function(callgroup) {
              return RSVP.all([
                callgroup.getParent().then(_.partial(addToRet, 'CallGroup')),
                callgroup.getCalls().then(_.partial(addAllToRet, 'Call')),
                callgroup.getCallGroups()
                  .then(_.partial(addAllToRet, 'CallGroup')),
                callgroup.getReferences()
                  .then(_.partial(addAllToRet, 'Reference'))
              ]);
            });
          case 'Reference':
            return loader.getReference(element.id).then(function(reference) {
              return RSVP.all([
                reference.getCalls().then(_.partial(addAllToRet, 'Call')),
                reference.getCallGroups()
                  .then(_.partial(addAllToRet, 'CallGroup'))
              ]);
            });
          default:
            return RSVP.Promise.resolv();
        }
      })).then(function() {
        return ret;
      });
    };
  }]);
