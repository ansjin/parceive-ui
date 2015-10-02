/* global document */

angular.module('app')
  .value('SizeService', {
    svgSize: function(svg) {
      var bound = svg[0][0].getBoundingClientRect();

      return {
        height: bound.height,
        width: bound.width
      };
    },

    textSize: function(text, fontSize) {
      var test = document.getElementById('textSizeTest');

      test.innerHTML = text;

      if (fontSize) {
        test.style.fontSize = fontSize + 'pt';
      } else {
        delete test.style.fontSize;
      }

      return {
        height: test.clientHeight,
        width: test.clientWidth
      };
    },

    svgTextSize: function(text, fontSize) {
      var test = document.getElementById('hiddenSVGTextTest');

      test.textContent = text;

      if (fontSize) {
        test.style.fontSize = fontSize + 'pt';
      } else {
        delete test.style.fontSize;
      }

      var bbox = test.getBBox();

      return {
        height: bbox.height,
        width: bbox.width
      };
    }
  });
