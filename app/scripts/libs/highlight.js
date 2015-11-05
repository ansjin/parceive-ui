/* global hljs */

angular.module('app')
  .service('highlight', function() {
    hljs.configure({languages: ['cpp']});

    return hljs;
  });
