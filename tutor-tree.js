queue()
  .defer(d3.csv, 'NCSS2009.csv')
  .defer(d3.csv, 'NCSS2010.csv')
  .defer(d3.csv, 'NCSS2011.csv')
//  .defer(d3.csv, 'NCSS2012.csv')
//  .defer(d3.csv, 'NCSS2013.csv')
  .await(loadNCSSTree)

// A list of people's names
var names = d3.map();
// A map of the tutors by group and year
var groupTutors = d3.map();
// Relationships list
var relationships = [];

function loadNCSSTree(error, tree2009, tree2010, tree2011, tree2012, tree2013) {
  var trees = [tree2009, tree2010, tree2011];
  
  // Build the groupTutors map
  trees.forEach(function(tree, year) {
    year += 2009;

    // Add a map for each year's groups
    groupTutors.set(year, d3.map());

    tree.forEach(function(person) {
      if (isTutor(person)) {
        // Get the group of tutors this person is in
        var group = groupTutors.get(year).get(person.group);

        // Construct a new group if it doesn't exist yet
        if (group === undefined)
          group = groupTutors.get(year).set(person.group, []);

        // Add the person to the group
        group.push(person);
      }

      // Add the person to the set of people
      names.set(person.name, {name: person.name});
    });
  });

  console.log(groupTutors);

  // Build the tutoredBy and tutoredWith maps
  trees.forEach(function(tree, year) {
    year += 2009;

    tree.forEach(function(person) {
      // Build the tutoredWith map
      if (isTutor(person)) {
        // Get the tutors this person tutored with
        var fellowTutors = groupTutors.get(year).get(person.group);

        // Add relationships
        if (fellowTutors)
          fellowTutors.forEach(function(tutor) {
            relationships.push({
              source: names.get(person.name),
              target: names.get(tutor.name),
              relationship: 'tutored with',
              year: year,
            });
          });
      }

      // Build the tutoredBy map
      else if (person.role === "student") {
        // Get the tutors who tutored this person
        var tutors = groupTutors.get(year).get(person.group);

        // Add relationships
        if (tutors)
          tutors.forEach(function(tutor) {
            relationships.push({
              source: names.get(person.name),
              target: names.get(tutor.name),
              relationship: 'tutored by',
              year: year,
            });
          });
      }
    });
  });

  // Create the graph visualization
  var personRadius = 20;

  // SVG element
  var svg = d3.select('body').append('svg');
  
  // Groups of elements
  var peopleGroup = svg.append('svg:g')
    .attr('class', 'people');

  var relationshipGroup = svg.append('svg:g')
    .attr('class', 'relationships');

  var people, rels;

  updateGraph = function() {
    // Each person has an group element
    people = peopleGroup.selectAll('g.person')
      .data(names.values());

    // People get given a group element when they start NCSS
    group = people.enter().append('svg:g')
      .attr('class', 'person');
    // ...with a circle
    group.append('svg:circle')
      .attr('r', personRadius)
    // ...and a label for their name
    group.append('svg:text')
      .attr('fill', 'white')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')

    // People's elements are positioned
    people
      .attr('title', function(person) { return person.name; })
      .each(function(person) {
        // ...and are labelled with their names
        d3.select(this).select('text')
          .text(function(person) { return person.name; });
      })
      .call(force.drag);

    // The bubbles are fit to the text
    personRadius = 0;
    group.selectAll('text').each(function() {
       var bbox = this.getBBox();
       if (bbox.width > personRadius)
         personRadius = bbox.width/2 + 15;
    });
    // Update the link size to the bubble size
    force.linkDistance(personRadius*2 + 30);

    // People's circles are resized
    people
      .each(function(person) {
        d3.select(this).select('circle')
          .attr('r', personRadius);
      });

    // People have relationships
    rels = relationshipGroup.selectAll('line.relationship')
      .data(relationships);

    // Relationships are given lines
    rels.enter().append('svg:line')
      .attr('stroke', 'white');

    // Relationships are classed and labelled
    rels
      .attr('class', function(rel) { return 'relationship ' + rel.relationship; })
      .attr('source', function(rel) { return rel.source.name; })
      .attr('target', function(rel) { return rel.target.name; })
  
    // Set the force layout data
    force
      .nodes(names.values())
      .links(relationships)
      .start();
  }

  // Add force layout to the graph
  var element = document.getElementsByTagName('body')[0];
  var force = d3.layout.force()
    .charge(-400)
    .size([element.offsetWidth, element.offsetHeight]);

  // Update tutor/relationships positions
  force.on('tick', function() {
    rels
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    people
      .attr("transform", function(d) { return 'translate('  + d.x + ', ' + d.y + ')'; })
   });

  updateGraph();
}

// Determine whether a person's role is a tutor role
function isTutor(person) {
  return person.role === "tutor" || person.role === "industry tutor" || person.role === "group leader";
}
