var colors = ['#005500', '#6A5800', '#6A0000'];
var colorsBright = ['#6FBA6F', '#E8D88B', '#E88B8B'];
var colorsDark = ['#95DA95', '#FFF1AF', '#FFAFAF'];


angular.module('app')
  .service('GradientService', ['d3', function(d3) {
    function gradient(min, max) {
      return d3.scale.linear()
        .domain([min, (min + max) / 2, max])
        .range(colors);
    }

    function gradientBright(min, max) {
      return d3.scale.linear()
        .domain([min, (min + max) / 2, max])
        .range(colorsBright);
    }

    function gradientDark(min, max) {
      return d3.scale.linear()
        .domain([min, (min + max) / 2, max])
        .range(colorsDark);
    }

    function value(min, max, color) {
      return gradient(min, max)(color);
    }

    return {
      gradient: gradient,
      gradientBright: gradientBright,
      gradientDark: gradientDark,
      value: value,
      setColors: function(newColors) {
        colors = newColors;
      }
    };
  }]);
