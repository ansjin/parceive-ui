function initCb(loader, highlight, jump) {
  return function cb(stateManager, data) {
    var state = stateManager.getData();

    var file = _.find(data, function(e) {
      return e.type === 'File' && (jump | !e.neighbour);
    });

    data = _.filter(data, function(e) {
      return !e.neighbour;
    });

    var filePromise;

    if (file) {
      state.file = file.id;
      stateManager.save();

      filePromise = loader.getFile(file.id).then(function(file) {
        return file.getContent().then(function(data) {
          return highlight(data, "C++", true);
        });
      });
    }

    var functionLines = RSVP.all(_.chain(data)
        .filter(function (d){
          return d.type === 'Function' || d.type === 'Call'
        })
        .map(function(d) {
          switch(d.type) {
            case 'Call':
              return loader.getCall(d.id).then(function (call){
                return call.getFunction();
              });
            case 'Function':
              return loader.getFunction(d.id);
          }
        })
        .value()).then(function(fcts) {
          return _.chain(fcts).filter(function(fct) {
            return fct.fileID === state.file;
          }).map(function(fct) {
            return {
              'line': fct.startLine,
              'column': fct.column,
              'type': 'Definition'
            };
          }).value();
        });

    var callLines = RSVP.all(_.chain(data)
      .filter(function(el) {
        return el.type === 'Call';
      }).map(function(el) {
        return loader.getCall(el.id).then(function(call) {
          return call.getInstruction().then(function(instruction) {
            if (_.isNull(instruction)) {
              return null;
            }

            return instruction.getCall().then(function(icall) {
              return icall.getFunction();
            }).then(function(ifct) {
              if(ifct.fileID !== state.file) {
                return null;
              }

              return {
                'line': instruction.lineNumber,
                'column': instruction.column,
                'type': 'Call'
              };
            });
          });
        });
      }).value()).then(function(lines) {
        return _.filter(lines, function(line) {
          return !_.isNull(line);
        })
      });

    var linesPromise = RSVP.all([functionLines, callLines])
      .then(function(arr) {
        return _.flatten(arr);
      });

    RSVP.hash({
      'fileContents': filePromise,
      'highlightLocations': linesPromise,
      'jump': jump
    })
    .then(state.unsaved.update);
  };
}

angular.module('source-view', ['app'])
.value('name', 'Source View')
.value('group', 'Source Code')
.value('markedCb', function() {})
.service('focusCb', ['LoaderService', 'highlight', function(loader, highlight) {return initCb(loader, highlight, true)}])
.service('hoverCb', ['LoaderService', 'highlight', function(loader, highlight) {return initCb(loader, highlight, false)}])
.service('spotCb', ['LoaderService', 'highlight', function(loader, highlight) {return initCb(loader, highlight, true)}])
.service('render', ['highlight', 'LoaderService', 'jquery', 'd3',
function(highlight, loader, $, d3) {
  return function(svg, stateManager) {
    _.delay(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      header.css('overflow', 'auto');
      var codeElement = d3.select(header.children('pre.highlight')[0]);

      var state = stateManager.getData();

      state.unsaved.update = function(data, jump) {
        if (!_.isUndefined(data.fileContents)) {
          codeElement.html(data.fileContents);
        }

        codeElement.selectAll('ol > li').style('background-color', null);

        _.forEach(data.highlightLocations, function(location) {
          var line = codeElement.select('ol > li:nth-child(' +
                                        (location.line) + ')');

          if (location.type === 'Call') {
            line.style('background-color', '#88FFFF');
          } else {
            line.style('background-color', '#FFFF88');
          }
        });

        if (data.jump && data.highlightLocations.length > 0) {
          var dst = data.highlightLocations[0].line;

          var line = codeElement.select('ol > li:nth-child(' +
                                        (dst) + ')');

          line[0][0].scrollIntoView();
        }
      };

      if (state.file) {
        codeElement.text('Loading');

        loader.getFile(state.file).then(function(file) {
          return file.getContent().then(function(data) {
            return highlight(data, "C++", true);
          });
        }).then(function(contents) {
          state.unsaved.update({
            'highlightLocations': [],
            'fileContents': contents
          });
        });
      }
    }, 10);
  };
}]);
