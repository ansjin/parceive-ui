var colors = ['green', 'gold', 'orange', 'brown', 'red'];

angular.module('app')
  .service('GradientService', ['d3', function(d3) {
    function gradient(min, max) {
      if (min === max) {
        min = max - 1;
      }

      return d3.scale.quantize()
        .domain([min, (min + max) / 2, max])
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
