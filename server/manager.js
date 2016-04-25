var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();
var express = require('express');

var fs = require('fs');
var RSVP = require('rsvp');

var readFile = RSVP.denodeify(fs.readFile);
var writeFile = RSVP.denodeify(fs.writeFile);
var readdir = RSVP.denodeify(fs.readdir);

function validateConfigAction(state) {
  return RSVP.resolve();
}

function staticAnalysisAction(state) {
  return RSVP.resolve();
}

function checkFileAccessAction(state) {
  return RSVP.resolve();
}

function writeConfigToDbAction(state) {
  return RSVP.resolve();
}

var staticPipeline = [
  {
    name: "Validate config",
    action: validateConfigAction,
  },
  {
    name: "Static analysis",
    action: staticAnalysisAction,
  },
  {
    name: "Check file access",
    action: checkFileAccessAction,
  },
  {
    name: "Write config to db",
    action: writeConfigToDb,
  }
];

function validateDbAction(state) {
  return RSVP.resolve();
}

function copyStaticAnalysisDatabaseAction(state) {
  return RSVP.resolve();
}

function runDynamicAnalysisAction(state) {
  return RSVP.resolve();
}

function importDatabaseAction(state) {
  return RSVP.resolve();
}

function copyStaticAnalysisDatabaseAction(state) {
  return RSVP.resolve();
}

var dynamicPipeline = [
  {
    name: "Validate config",
    action: validateConfigAction,
  },
  {
    name: "Validate database",
    action: validateDbAction,
  },
  {
    name: "Copy static analysis database",
    action: copyStaticAnalysisDatabaseAction,
  },
  {
    name: "Run dynamic analysis",
    action: runDynamicAnalysisAction,
  },
  {
    name: "Import database",
    action: importDatabaseAction,
  },
  {
    name: "Write config to db",
    action: writeConfigToDbAction,
  }
];

var pipelines = {
  'static': staticPipeline,
  'dynamic': dynamicPipeline
};

var stateIdCounter = 0;

function genState(project) {
  var ret = {
    pipeline: 'static',
    step: 0,
    running: false,
    config: _.cloneDeep(project.config)
  }

  ret.promise = RSVP.resolve();

  ret.id = stateIdCounter++;
}

function stateToJSON(state) {
  return JSON.stringify(state);
}

function JSONToState(json) {
  return JSON.parse(json);
}

function runNextStep(state) {
  pipeline = pipelines[state.pipeline];

  if (state.step < pipeline.length) {
    state.running = true;

    state.promise = pipeline[state.step].action(state).then(function() {
      state.step++;
      state.running = false;

      return writeFile(state.configPath, stateToJSON(state)).then(function() {
        runNextStep(state);

        return state;
      });
    });
  } else {
    state.promise = RSVP.resolve();
  }
}

var projects = null;

function loadProject(dir) {
  var myDir = 'data/projects/' + dir + '/';

  return readFile(myDir + 'config.json').then(function(config) {
    project = {
      'config': config,
      'name': dir,
      'dir': myDir
    };

    return readdir(myDir + 'runs').then(function(runs) {
      RSVP.all(_.map(runs, function(run) {
        return readFile(myDir + 'runs/' + run + '/config.json').then(function(json) {
          return JSONToState(json);
        });
      })).then(function(runs) {
        project.runs = runs;

        return project;
      });
    })
  });
}

function loadProjects() {
  readdir('data/projects').then(function(dirs) {
    return _.map(dirs, function(dir) {
      return loadProject(dir);
    })
  }).then(function(lprojects) {
    projects = lprojects;
  })
}

var router = express.Router();

router.get('/projects', function(req, res) {
  var arr = _.map(projects, function(project) {
    return {
      'config': project.config,
      'runs': _.map(project.runs, function(run) {
        JSON.parse(stateToJSON(run));
      })
    };
  });

  res.send(JSON.stringify(arr));
});

router.use('/projects/:project', function(req, res, next) {
  req.project = _.find(projects, function(project) {
    return project.name === req.params.project;
  });

  next();
});

router.post('/projects/:project/configure', function(req, res) {
  req.project.config = JSON.parse(req.body.config);

  writeFile(req.project.dir + 'config.json', req.body.config).then(function() {
    res.send('ok');
  });
});

router.post('/projects/:project/newrun', function(req, res) {
  var run = genState(req.project);

  run.pipeline = 'dynamic';

  req.project.runs.push(run);

  res.send('ok');
});

router.use('/projects/:project/run/:run', function(req, res) {
  req.run = _.find(req.project.runs, function(run) {
    return run.id === req.params.run;
  });

  next();
});

router.post('/projects/:project/run/:run/pipeline', function(req, res) {
  req.run.pipeline = req.body.pipeline;
  req.run.step = 0;
});

router.post('/projects/:project/run/:run/start', function(req, res) {
  runNextStep(req.run);

  res.send('ok');
});

router.post('/projects/:project/run/:run/restart', function(req, res) {
  req.run.step = 0;

  runNextStep(req.run);

  res.send('ok');
});

router.get('/projects/:project/run/:run/state', function(req, res) {
  res.send(stateToJSON(req.run))
});

router.get('/projects/:project/run/:run/wait', function(req, res) {
  req.run.promise.then(function() {
    res.send(stateToJSON(req.run));
  });
});

module.exports = {
  'loadProjects': loadProjects,
  'router': router
};
