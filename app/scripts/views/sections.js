angular.module('section-view', ['app'])
.value('name', 'Section analyser')
.value('group', 'Parallelization')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.value('spotCb', function() {})
.service('render', ['LoaderService', 'jquery', 'd3', 'SizeService',
  function(loader, $, d3, SizeService) {
  function loadData(sectionId) {
    var data = {};

    return loader.getTagInstance(sectionId).then(function(section) {
      data.section = section;

      return section.getNestedTasks().then(function(tagInstances) {
        return RSVP.all(_.map(tagInstances, function(tagInstance) {
          return RSVP.hash({
            tagInstance: tagInstance,
            tag: tagInstance.getTag()
          });
        }));
      }).then(function(elements) {
        return _.chain(elements)
            .filter(function(element) {
              return element.tag.type === 10;
            })
            .pluck('tagInstance')
            .value();
      }).then(function(tasks) {
        data.tasks = tasks;

        return data.section.getSectionTaskConflicts();
      }).then(function(conflicts) {
        data.conflicts = conflicts;

        return data;
      });
    });
  }

  function calculateParallel(data, cores) {
    data.tasks = _.sortBy(data.tasks, 'duration');
    data.tasks.reverse();

    data.parallel = new Array(cores);
    while(cores--) {
      data.parallel[cores] = [];
      data.parallel[cores].at = 0;
    }
    cores = data.parallel.length;

    _.forEach(data.tasks, function(task) {
      data.parallel = _.sortBy(data.parallel, 'at');

      data.parallel[0].push(task);
      data.parallel[0].at += task.duration;
    });

    data.parallel = _.sortBy(data.parallel, 'at');
    data.parallel.duration = data.parallel[data.parallel.length - 1].at;
  }

  function assignNames(data) {
    data.names = {};

    function colName(n) {
        var ordA = 'A'.charCodeAt(0);
        var ordZ = 'Z'.charCodeAt(0);
        var len = ordZ - ordA + 1;

        var s = "";
        while(n >= 0) {
            s = String.fromCharCode(n % len + ordA) + s;
            n = Math.floor(n / len) - 1;
        }
        return s;
    }

    _.forEach(data.tasks, function(task, index) {
      data.names[task.id] = colName(index);
    });
  }

  return function(svg) {
    _.delay(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      var footer = $(svg[0][0]).parent().siblings('div.html-footer');
      header.css('overflow', 'auto');
      footer.css('overflow', 'auto');
      var selectField = d3.select(header.children('select')[0]);
      var conflictsTable = d3.select(footer.children('table')[0]);

      function update() {
        loadData(selectField.property('value')).then(function(data) {
          calculateParallel(data, 4);
          assignNames(data);

          /*var elements = conflictsTable.selectAll('tr').data(data.conflicts);

          elements.exit().remove();
          var enter = elements.enter().append('tr');

          enter.append('td').data(function(d) {return data.names[d.task1.id];});
          enter.append('td').data(function(d) {return data.names[d.task2.id];});
          enter.append('td').data(function(d) {return d.access1.type;});
          enter.append('td').data(function(d) {return d.access2.type;});*/

          var maxSeqDuration = _.sum(data.tasks, function(el) {
            return el.duration;
          });

          var maxParDuration = data.parallel.duration;
          var svgWidth = SizeService.svgSize(svg).width - 10 - data.tasks.length;

          svg.selectAll("*").remove();

          var g = svg.append('g')
            .attr('class', 'sections');

          var sequentialGroup = g.append('g')
                        .attr('class', 'sequential-group');

          var parallelGroup = g.append('g')
                        .attr('class', 'parallel-group');

          var seqTask = {};
          var atX = 0;
          var seqMultiplier = maxSeqDuration / svgWidth;
          _.forEach(data.tasks, function(task) {
            seqTask[task.id] = {
              x: atX,
              width: task.duration / seqMultiplier,
              task: task
            };

            atX += seqTask[task.id].width + 1;
          });

          svg.append('g')
            .attr('class', 'seq-header')
            .append('text')
            .text('Sequential Run')
            .attr('x', 0)
            .attr('y', 12);

          sequentialGroup.selectAll('rect')
            .data(data.tasks)
            .enter()
            .append('rect')
            .attr('x', function(d) {
                return seqTask[d.id].x;
            })
            .attr('y', 15)
            .attr('height', 20)
            .attr('width', function(d) {
              return seqTask[d.id].width;
            });
          sequentialGroup.selectAll('text')
            .data(data.tasks)
            .enter()
            .append('text')
            .attr('x', function(d) {
                return seqTask[d.id].x + 5;
            })
            .attr('y', 30)
            .text(function(d) {
              return data.names[d.id];
            });

          var parTask = {};
          var parMultiplier = maxSeqDuration / svgWidth;
          var atY = 61;
          _.forEach(data.parallel, function(row) {
            atX = 0;

            _.forEach(row, function(task) {
              parTask[task.id] = {
                x: atX,
                y: atY,
                width: task.duration / parMultiplier,
                task: task
              };

              atX += parTask[task.id].width + 1;
            });

            atY += 21;
          });

          svg.append('g')
            .attr('class', 'par-header')
            .append('text')
            .text('Parallel Run')
            .attr('x', 0)
            .attr('y', 52);

          parallelGroup.selectAll('rect')
            .data(data.tasks)
            .enter()
            .append('rect')
            .attr('x', function(d) {
                return parTask[d.id].x;
            })
            .attr('y', function(d) {
              return parTask[d.id].y;
            })
            .attr('height', 20)
            .attr('width', function(d) {
              return parTask[d.id].width;
            });
          parallelGroup.selectAll('text')
            .data(data.tasks)
            .enter()
            .append('text')
            .attr('x', function(d) {
                return parTask[d.id].x + 5;
            })
            .attr('y', function(d) {
              return parTask[d.id].y + 15;
            })
            .text(function(d) {
              return data.names[d.id];
            });

          svg.append('g')
            .attr('class', 'speedup')
            .append('text')
            .text('Possible Speedup: ' + maxSeqDuration / maxParDuration)
            .attr('x', 0)
            .attr('y', atY + 15);

          svg.append('g')
            .attr('class', 'speedup')
            .append('text')
            .text('No conflicts')
            .attr('x', 0)
            .attr('y', atY + 30);
        });
      }

      selectField.on('change', update);

      loader.getAllSections().then(function(sections) {
        return RSVP.all(_.map(sections, function(section) {
          return section.getTag();
        })).then(function(tags) {
          selectField.selectAll('option')
          .data(sections)
          .enter()
          .append('option')
          .attr('value', function(d) {return d.id; })
          .text(function(d, i) {return tags[i].name; });

          _.delay(update, 10);
        });
      });

    }, 10);
  };
}]);
