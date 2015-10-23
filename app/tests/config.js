var expect = chai.expect;

mocha.ui('bdd');

var $injector = angular.injector(['ng', 'app']);

var loader = $injector.get('LoaderService');

chai.should();
