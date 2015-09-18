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
        test.style.fontSize = fontSize;
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
        test.style.fontSize = fontSize;
      } else {
        delete test.style.fontSize;
      }

      var bbox = test.getBBox();

      return {
        height: bbox.height,
        width: bbox.width
      };
    },

    svgSizeById: function(id) {
      var doc = document.getElementById(id);
      var bbox = doc.getBBox();
      return {
        height: Math.ceil(bbox.height),
        width: Math.ceil(bbox.width)
      };
    }
  });
