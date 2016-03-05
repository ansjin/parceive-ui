
angular
  .module('app')
  .factory('profilerVarHelper', profilerVarHelper);

// inject dependencies
profilerVarHelper.$inject = [];

function profilerVarHelper() {
  var factory = {
    initVar: initVar,
    initZoomVars: initZoomVars
  };

  return factory;

  function initVar() {
    return {
      viewMode: 'T', // valid values T: tracing, P: profiling
      initTracingMode: true, // checks if tracing view has been loaded before
      initProfilingMode: false, // checks if profiling view has been loaded before
      mainDuration: null, // runtime of main function
      mainCallId: null, // ID of main function
      mainCallGroupId: null, // callGroup ID of main
      runtimeThreshold: null, // minimum runtime required for children to load
      thresholdFactor: 1, // % of runtime required for children to load
      tracingData: {}, // data object for tracing view
      profilingData: {}, // data object for profiling view
      viewData: {}, // store the current data used to display profiler
      callHistory: [], // stores id's of calls that have been retrieved
      callGroupHistory: [], // stores id's of call groups that have been retrieved
      rectHeight: 22, // height of the bars in the profiler
      textPadY: 15, // top padding for the text svg
      textPadX: 0.5, // left padding for the text svg
      adjustLevel: 0, // stores level -1 of bar at the top position of the profiler
      transTime: 600, // transition time for appending a bar to profiler
      transType: 'elastic', // type of append transition
      maxLevel: 1, // current highest level of bars on the profiler
      svgWidth: '100%', // width of the svg
      svgElem: null, // reference to svg element
      svgParentElem: null, // reference to svg's parent element
      profileId: null, // random ID to differentiate profiling views on DOM
      initView: false, // flag to check if view has been initialized before
      partition: null, // holds modified d3 partition value function
      zoomId: null, // id of call or callGroup that is currently zoomed to top
      zoomHistory: [], // stores previously zoomed nodes
      selectedTracingNodes: [], // stores selected nodes for tracing
      selectedProfilingNodes: [], // stores selected nodes for profiling
      minTooltipWidth: 150, // minimun width of the tooltip
      gradient: null, // holds gradient function
      widthScale: null, // holds function to calculate width of call
      xScale: null, // holds function to calculate x position of call
      clickCount: 0, // click counter for determining double or single click
      clickData: null, // clicked node data
      clickThis: null, // reference to the 'this' for the clicked node
      zoomTracingId: null, // hold value of zoomId in trace view on mode switch
      zoomProfilingId: null, // hold value of zoomId in profiling view on mode switch
      zoomTracingHistory: [], // hold trace view zoom history on mode switch
      zoomProfilingHistory: [], // hold profiling view zoom history on mode switch
      zoomTracingAdjustment: 0, // "adjustLevel" value for tracing on mode switch
      zoomProfilingAdjustment: 0, // "adjustLevel" value for profiling on mode switch
      zoomTracingMaxLevel: 1, // "maxLevel" value for tracing on mode switch
      zoomProfilingMaxLevel: 1, // "maxLevel" value for profiling on mode switch
      showLoop: false // show loops in visualization
    };
  }

  function initZoomVars(v, isTracing) {
    // store some variables for use when returning back to the 
    // view we are toggling out of
    if (isTracing) {
      v.zoomTracingId = v.zoomId;
      v.zoomTracingHistory = v.zoomHistory;
      v.zoomTracingAdjustment = v.adjustLevel;
      v.zoomTracingMaxLevel = v.maxLevel;
    } else {
      v.zoomProfilingId = v.zoomId;
      v.zoomProfilingHistory = v.zoomHistory;
      v.zoomProfilingAdjustment = v.adjustLevel;
      v.zoomProfilingMaxLevel = v.maxLevel;
    }
  }
}
