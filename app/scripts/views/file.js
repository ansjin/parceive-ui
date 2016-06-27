function initCb(loader, highlight, jump) {
  return function cb(stateManager, data) {
    var state = stateManager.getData();

    var file = _.find(data, function(e) {
      return e.type === 'File' && (jump || !e.neighbour);
    });

    data = _.filter(data, function(e) {
      return !e.neighbour;
    });

    var filePromise;
    var sourceLocationsPromise;

    if (file) {
      state.file = file.id;
      stateManager.save();

      var getFile = loader.getFile(file.id);

      filePromise = getFile.then(function(file) {
        return file.getContent().then(function(data) {
          return highlight(data, "C++", true);
        });
      });

      sourceLocationsPromise = getFile.then(function(file) {
        return file.getSourceLocations();
      });
    }

    var accessLines = RSVP.all(_.chain(data)
        .filter(function (d){
          return d.type === 'Reference';
        }).map(function(d) {
          return loader.getReference(d.id).then(function(ref) {
            return ref.getAccesses().then(function(accesses) {
              return RSVP.all(_.map(accesses, function(access) {
                return access.getInstruction().then(function(instr) {
                  return instr.getCall().then(function(call) {
                    return call.getFunction();
                  }).then(function(fct) {
                    return [fct.fileID, instr.lineNumber];
                  });
                });
              }));
            });
          });
        }).value()).then(function(accesses) {
          return _.chain(accesses).map(function(el) {
            return _.filter(el, function(access) {
              return access[0] === state.file;
            });
          }).filter(function(el) {
            return el.length > 0;
          }).flatten().map(function(access) {
            return {
              'line': access[1],
              'column': 0,
              'type': 'Reference'
            };
          }).value();
        });

    var functionLines = RSVP.all(_.chain(data)
        .filter(function (d){
          return d.type === 'Function' || d.type === 'Call';
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
        });
      });

    var linesPromise = RSVP.all([functionLines, callLines, accessLines])
      .then(function(arr) {
        return _.flatten(arr);
      });

    RSVP.hash({
      'fileContents': filePromise,
      'sourceLocations': sourceLocationsPromise,
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
.service('focusCb', ['LoaderService', 'highlight', function(loader, highlight) {return initCb(loader, highlight, true);}])
.service('hoverCb', ['LoaderService', 'highlight', function(loader, highlight) {return initCb(loader, highlight, false);}])
.service('spotCb', ['LoaderService', 'highlight', function(loader, highlight) {return initCb(loader, highlight, true);}])
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

          codeElement.attr('id', stateManager.getId());

          var locations = data.sourceLocations;
          $(function() {
            $.contextMenu({
              selector: '#' + stateManager.getId() + ' ol > li',
              build: function(menu) {
                var line = menu.index() + 1;
                var location = _.find(locations,
                  function(location) {
                    return location.line === line;
                  });
                var currentFile = stateManager.getData().file;
                var currentTag = _.find(stateManager.getMarked(),
                  function(element) {
                    return element.type === 'TagInstruction' &&
                            element.file ===  currentFile &&
                            element.line === line;
                  });

                if (_.isUndefined(location)) {
                  return {
                    items: {
                      'notKnown': {
                        name: 'Line is not available in debug information',
                        disabled: true
                      }
                    }
                  };
                } else if(_.isUndefined(currentTag)) {
                  var genMarking = function(tagName, action) {
                    return {
                      'type': 'TagInstruction',
                      'tag': tagName,
                      'location': location.id,
                      'line': line,
                      'file': currentFile,
                      'id': currentFile + '-' + line,
                      'action': action,
                      'isMarked': true
                    };
                  };

                  var mark = function(tagName, action) {
                    stateManager.mark(genMarking(tagName, action));
                  };

                  var genTagMenu = function(tagName) {
                    var data = {
                      name: 'Add ' + tagName + ' Tag Instruction',
                      items: {

                      }
                    };

                    data.items['startTag:' + tagName] = {
                      name: 'Start Tag',
                      callback: _.partial(mark, tagName, 'Start')
                    };

                    data.items['endTag:' + tagName] =  {
                      name: 'Stop Tag',
                      callback: _.partial(mark, tagName, 'Stop')
                    };

                    return data;
                  };

                  var tagMenu = {};

                  var tags = _.filter(stateManager.getMarked(), function(element) {
                    return element.type === 'Tag';
                  });

                  _.forEach(tags, function(tag){
                    tagMenu[tag.name] = genTagMenu(tag.name);
                  });

                  return {
                    items: {
                      'addTag': {
                        name: "Add Tag Instruction",
                        items: tagMenu
                      }
                    }
                  };
                } else {
                  return {
                    items: {
                      'removeTag': {
                        name: 'Remove Tag Instruction',
                        callback: function( ){
                          currentTag.isMarked = false;
                          stateManager.mark(currentTag);
                        }
                      }
                    }
                  };
                }

              }
            });
          });
        }

        codeElement.selectAll('ol > li').style('background-color', null);

        _.forEach(data.highlightLocations, function(location) {
          var line = codeElement.select('ol > li:nth-child(' +
                                        location.line + ')');

          if (location.type === 'Call') {
            line.style('background-color', '#88FFFF');
          } else if (location.type === 'Reference') {
            line.style('background-color', '#66FF66');
          } else if (location.type === 'Function') {
            line.style('background-color', '#FFFF88');
          }
        });

        if (data.jump && data.highlightLocations.length > 0) {
          var dst = data.highlightLocations[0].line;

          var line = codeElement.select('ol > li:nth-child(' +
                                        dst + ')');

          line[0][0].scrollIntoView();
        }
      };

      if (state.file) {
        codeElement.text('Loading');

        loader.getFile(state.file).then(function(file) {
          return RSVP.hash({
            'fileContents': file.getContent().then(function(data) {
              return highlight(data, "C++", true);
            }),
            'sourceLocations': file.getSourceLocations(),
            'highlightLocations': []
          });
        }).then(function(data) {
          state.unsaved.update(data);
        });
      }
    }, 10);
  };
}]);
