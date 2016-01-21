var expect = chai.expect;

mocha.ui('bdd');
mocha.setup({globals: ['LiveReload']});

var $injector = angular.injector(['ng', 'app']);

var loader = $injector.get('LoaderService');

chai.should();

var assert = chai.assert;
