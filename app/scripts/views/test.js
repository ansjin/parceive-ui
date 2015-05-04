angular.module('test1-view', [])
.value('name', "Test view 1")
.value('render', function(svg) {
  svg.selectAll('*').remove();
  
  svg
    .append("circle")
    .style("stroke", "gray")
    .style("fill", "blue")
    .attr("r", 40)
    .attr("cx", 50)
    .attr("cy", 50)
    .on("mouseover", function(){d3.select(this).style("fill", "aliceblue");})
    .on("mouseout", function(){d3.select(this).style("fill", "blue");});
});

angular.module('test2-view', [])
.value('name', "Test view 2")
.value('render', function(svg) {
  svg.selectAll('*').remove();
  
  svg
    .append("circle")
    .style("stroke", "gray")
    .style("fill", "red")
    .attr("r", 40)
    .attr("cx", 50)
    .attr("cy", 50)
    .on("mouseover", function(){d3.select(this).style("fill", "aliceblue");})
    .on("mouseout", function(){d3.select(this).style("fill", "red");});
});
