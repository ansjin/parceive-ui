angular
  .module('app')
  .factory('pSvg', pSvg);

// inject dependencies
pSvg.$inject = ['d3', 'SizeService'];

function pSvg(d3, size) {
  var factory = {
    drawRect: drawRect,
    drawRectText: drawRectText,
    drawLoop: drawLoop,
    drawLoopText: drawLoopText,
    drawLoopEnd: drawLoopEnd,
    drawLoopTooSmall: drawLoopTooSmall
  };

  return factory;

  function getYValue(_svg, d, isLoop) {
    var multiplier = d.level - _svg.currentTop.level;
    if (_svg.showLoop && _svg.isTracing) {
      multiplier += (d.loopAdjust - _svg.currentTop.loopAdjust);
    }
    var value = _svg.rectHeight * multiplier;
    if (isLoop) {
      value = value + 44;
      // console.log(d, _svg.viewLevels);
      // value = value + (_svg.viewLevels[d.level + 1] * _svg.rectHeight);
    }
    return value;
  }

  function drawRect(_svg, selection) {
    return new Promise(function(resolve, reject) {
      selection
        .data(_svg.nodes.filter(function(d) {
          // only show calls with duration >= runtimethreshold and
          // duration <= duration of current top level object
          return d.duration >= _svg.runtimeThreshold
          && d.duration <= _svg.currentTop.duration; // && d.threadID == 0;
        }))
        .enter()
        .append('rect')
        .attr('class', 'rect')
        .attr('stroke', 'white')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', 2)
        .attr('id', function(d) {
          return 'rect_' + d.id;
        })
        .attr('fill', function(d) {
          return _svg.gradientBright(d.duration);
        })
        .attr('x', function(d) {
          return _svg.xScale(d.start);
        })
        .attr('width', function(d) {
          return _svg.widthScale(d.duration);
        })
        .attr('height', function() {
          return _svg.rectHeight;
        })
        .attr('y', function(d) {
          return getYValue(_svg, d) - _svg.rectHeight;
        })
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill-opacity', 0)

        // add animation effect
        .transition()
        .duration(_svg.transTime)
        .ease(_svg.transType)
        .attr('y', function(d) {
          return getYValue(_svg, d);
        })
        .attr('fill-opacity', 1);

        resolve(true);
    });
  }

  function drawRectText(_svg, selection) {
    return new Promise(function(resolve, reject) {
      selection
        .data(_svg.nodes.filter(function(d) {
          // only show text for calls with duration >= runtimethreshold
          // and duration <= duration of current top level object
          // and widths big enough to contain the full name of the call
          if (document.getElementById('rect_' + d.id) == null) {
            return false;
          }

          var rectWidth = size.svgSizeById('rect_' + d.id).width;
          var textPad = 20; // left and right padding
          var textWidth = size.svgTextSize(d.name, 14).width + textPad;
          return d.duration >= _svg.runtimeThreshold
          && rectWidth > textWidth
          && d.duration <= _svg.currentTop.duration;
        }))
        .enter()
        .append('text')
        .attr('id', function(d) {
          return 'text_' + d.id;
        })
        .attr('class', 'rect')
        .attr('cursor', 'default')
        .attr('font-family', 'Arial')
        .attr('font-size', '14px')
        .attr('fill', function(d) {
          return _svg.gradient(d.duration);
        })
        .attr('fill-opacity', 0)
        .text(function(d) { return d.name; })
        .attr('x', function(d) {
          var sliced = Number(_svg.xScale(d.start).slice(0, -1));
          return Number(sliced + _svg.textPadX) + '%';
        })
        .attr('y', function(d) {
          return getYValue(_svg, d);
        })

        // add animation effect
        .transition()
        .duration(_svg.transTime)
        .ease(_svg.transType)
        .attr('fill-opacity', 1)
        .attr('y', function(d) {
          return getYValue(_svg, d) + _svg.textPadY;
        });

        resolve(true);
    });
  }

  function drawLoop(_svg, selection) {
    return new Promise(function(resolve, reject) {
      if (!_svg.showLoop) {
        return resolve(true);
      }

      _.forEach(_svg.nodes, function(obj, i) {
        if (obj.loopData.length > 0) {
          selection
          .data(obj.loopData.filter(function(d) {
            // only show loop for calls with loopIterationCount greater than 0
            // and loop duration >= current threshold and
            // loop duration <= the duration of current top level object
            return d.loopIterationCount > 0
            && d.loopDuration >= _svg.runtimeThreshold
            && d.loopDuration <= _svg.currentTop.duration;
          }))
          .enter()
          .append('line')
          .attr('class', 'loop')
          .attr('stroke', function(d) {
            return _svg.gradientBright(d.loopDuration);
          })
          .attr('stroke-width', 2)
          .attr('id', function(d) { return 'loopline_' + obj.id; })
          .attr('x1', function(d) {
            return _svg.xScale(d.loopStart);
          })
          .attr('x2', function(d) {
            return _svg.xScale(d.loopEnd);
          })
          .attr('y1', function(d) {
            return getYValue(_svg, obj, true) - _svg.rectHeight;
          })
          .attr('y2', function(d) {
            return getYValue(_svg, obj, true) - _svg.rectHeight;
          })
          .attr('fill-opacity', 0)

          // add animation effect
          .transition()
          .duration(_svg.transTime)
          .ease(_svg.transType)
          .attr('fill-opacity', 1)
          .attr('y1', function(d) {
            return (getYValue(_svg, obj, true) - Math.floor(_svg.rectHeight / 2));
          })
          .attr('y2', function(d) {
            return getYValue(_svg, obj, true) - Math.floor(_svg.rectHeight / 2);
          });
        }
      });

      resolve(true);
    });
  }

  function drawLoopText(_svg, selection) {
    return new Promise(function(resolve, reject) {
      if (!_svg.showLoop) {
        return resolve(true);
      }

      _.forEach(_svg.nodes, function(obj, i) {
        if (obj.loopData.length > 0) {
          selection
          .data(obj.loopData.filter(function(d) {
            // only show loop text for calls with duration >= runtimethreshold
            // and duration <= duration of current top level object
            // and loop line widths big enough to contain the iteration count text
            if (document.getElementById('loopline_' + obj.id) == null) {
              return false;
            }

            var loopWidth = size.svgSizeById('loopline_' + obj.id).width;
            var textPad = 20; // left and right padding
            var textWidth = size.svgTextSize(d.loopIterationCount, 14).width + textPad;
            return d.loopIterationCount > 0
            && d.loopDuration >= _svg.runtimeThreshold
            && loopWidth > textWidth;
          }))
          .enter()
          .append('text')
          .attr('id', function(d) { return 'looptext_' + obj.id; })
          .attr('class', 'line')
          .attr('font-family', 'Arial')
          .attr('font-size', '14px')
          .attr('fill', 'black')
          .attr('fill-opacity', 0)
          .text(function(d) { return d.loopIterationCount; })
          .attr('x', function(d) {
            var sliced = Number(_svg.xScale(Math.floor(d.loopStart + d.loopEnd) / 2).slice(0, -1));
            var pad = _svg.textPadX * d.loopIterationCount.toString().length;
            return Number(sliced - pad) + '%';
          })
          .attr('y', function(d) {
            return getYValue(_svg, obj, true) - _svg.rectHeight;
          })

          // add animation effect
          .transition()
          .duration(_svg.transTime)
          .ease(_svg.transType)
          .attr('fill-opacity', 1)
          .attr('y', function(d) {
            return getYValue(_svg, obj, true) - _svg.rectHeight + _svg.textPadY;
          });
        }
      });

      resolve(true);
    });
  }

  function drawLoopEnd(_svg, selection) {
    return new Promise(function(resolve, reject) {
      if (!_svg.showLoop) {
        return resolve(true);
      }

      _.forEach(_svg.nodes, function(obj, i) {
        if (obj.loopData.length > 0) {
          // add circle to left end of the loop
          selection
            .data(obj.loopData.filter(function(d) {
              // only show loop for calls with loopIterationCount greater than 0
              // and loop duration >= current threshold and
              // loop duration <= the duration of current top level object
              return d.loopIterationCount > 0
              && d.loopDuration >= _svg.runtimeThreshold
              && d.loopDuration <= _svg.currentTop.duration;
            }))
            .enter()
            .append('circle')
            .attr('class', 'loop')
            .attr('id', function(d) { return 'loopendleft_' + obj.id; })
            .attr('fill', function(d) { return _svg.gradientBright(d.loopDuration); })
            .attr('fill-opacity', 0)
            .attr('cx', function(d) { return _svg.xScale(d.loopStart); })
            .attr('cy', function(d) {
              return getYValue(_svg, obj, true) - _svg.rectHeight;
            })
            .attr('r', 4)

            // add animation effect
            .transition()
            .duration(_svg.transTime)
            .ease(_svg.transType)
            .attr('fill-opacity', 1)
            .attr('cy', function(d) {
              return getYValue(_svg, obj, true) - Math.floor(_svg.rectHeight / 2);
            });

          // add circle to right end of the loop
          selection
            .data(obj.loopData.filter(function(d) {
              // only show loop for calls with loopIterationCount greater than 0
              // and loop duration >= current threshold and
              // loop duration <= the duration of current top level object
              return d.loopIterationCount > 0
              && d.loopDuration >= _svg.runtimeThreshold
              && d.loopDuration <= _svg.currentTop.duration;
            }))
            .enter()
            .append('circle')
            .attr('class', 'loop')
            .attr('id', function(d) { return 'loopendright_' + obj.id; })
            .attr('stroke', function(d) { return _svg.gradientBright(d.loopDuration); })
            .attr('stroke-width', 1)
            .attr('fill', 'white')
            .attr('fill-opacity', 0)
            .attr('cx', function(d) { return _svg.xScale(d.loopEnd); })
            .attr('cy', function(d) {
              return getYValue(_svg, obj, true) - _svg.rectHeight;
            })
            .attr('r', 4)

            // add animation effect
            .transition()
            .duration(_svg.transTime)
            .ease(_svg.transType)
            .attr('fill-opacity', 1)
            .attr('cy', function(d) {
              return getYValue(_svg, obj, true) - Math.floor(_svg.rectHeight / 2);
            });
        }
      });

      resolve(true);
    });
  }

  function drawLoopTooSmall(_svg, selection) {
    return new Promise(function(resolve, reject) {
      if (!_svg.showLoop) {
        return resolve(true);
      }

      _.forEach(_svg.nodes, function(obj, i) {
        if (obj.loopData.length > 0) {
          selection
            .data(obj.loopData.filter(function(d) {
              // only show loop for calls with loopIterationCount greater than 0
              // and loop duration < current threshold
              if (document.getElementById('rect_' + obj.id) == null) {
                return false;
              }

              return d.loopIterationCount > 0
              && d.loopDuration < _svg.runtimeThreshold;;
            }))
            .enter()
            .append('circle')
            .attr('class', 'small')
            .attr('id', function(d) { return 'loopsmall_' + obj.id; })
            .attr('fill', function(d) { return _svg.gradientBright(d.loopDuration); })
            .attr('fill-opacity', 0)
            .attr('cx', function(d) {
              return _svg.xScale(Math.floor((d.loopStart + d.loopEnd) / 2));
            })
            .attr('cy', function(d) {
              return getYValue(_svg, obj, true) - _svg.rectHeight;
            })
            .attr('r', 4)

            // add animation effect
            .transition()
            .duration(_svg.transTime)
            .ease(_svg.transType)
            .attr('fill-opacity', 1)
            .attr('cy', function(d) {
              return getYValue(_svg, obj, true) - Math.floor(_svg.rectHeight / 2);
            });
          }
      });

      resolve(true);
    });
  }

}
