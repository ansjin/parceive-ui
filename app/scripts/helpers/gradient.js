var colors = ['green', 'red'];

angular.module('app')
  .service('GradientService', ['d3', function(d3) {
    function gradient(min, max) {
      return d3.scale.linear()
        .domain([min, max])
        .range(colors);
    }

    function value(min, max, color) {
      return gradient(min, max)(color);
    }

    return {
      gradient: gradient,
      value: value,
      setColors: function(newColors) {
        colors = newColors;
      }
    };
  }]);
