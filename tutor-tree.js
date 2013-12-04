queue()
  .defer(d3.csv, 'NCSS2009.csv')
  .defer(d3.csv, 'NCSS2010.csv')
  .defer(d3.csv, 'NCSS2011.csv')
  .defer(d3.csv, 'NCSS2012.csv')
  .defer(d3.csv, 'NCSS2013.csv')
  .defer(d3.csv, 'NCSS2014.csv')
  .await(loadNCSSTree)

// A list of people's names
var names = d3.map();
// A map of the tutors by group and year
var groupTutors = d3.map();
// Relationships list
var relationships = [];

function loadNCSSTree(error) {
  // Take in all the trees from the arguments
  var trees = [];
  for (var i = 1; i < arguments.length; i++)
    trees.push(arguments[i]);
  
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
  var relFilter = d3.map();
  relFilter.set('tutored by', true);

  var personRadius = 20;

  // Create a colour set for the graph
  colours = []
  for (var hue = 0; hue < 360; hue += 50)
    colours.push('hsla(' + hue + ', 60%, 70%, 0.8)');

  var relationshipColour = d3.scale.ordinal()
    .range(colours);

  // SVG element
  var svg = d3.select('.graph').append('svg');
  
  // Scaling
  x = d3.scale.linear()
    .range([0, svg.property('offsetWidth')]);
  xScale = d3.scale.linear()
    .range([0, 1]);

  y = d3.scale.linear()
    .range([0, svg.property('offsetHeight')]);
  yScale = d3.scale.linear()
    .range([0, 1]);

  // Zoom behaviour
  function peopleTransform(person) {
    people.attr("transform", function(person) {
      return "translate(" + x(xScale(person.layout.x)) + "," + y(yScale(person.layout.y)) + ")";
    });
  }
  function relsTransform() {
    rels.attr('xxxx', function(d) { return JSON.stringify(d.source.layout) } );
    rels
      .attr("x1", function(d) { return x(xScale(d.source.layout.x)); })
      .attr("y1", function(d) { return y(yScale(d.source.layout.y)); })
      .attr("x2", function(d) { return x(xScale(d.target.layout.x)); })
      .attr("y2", function(d) { return y(yScale(d.target.layout.y)); });
  }
  function transformGraph() {
    peopleTransform();
    relsTransform();
  }
  var zoom = d3.behavior.zoom()
    .x(x)
    .y(y)
    .on("zoom", transformGraph)

  svg.call(zoom);

  // Groups of elements
  var container = svg.append('svg:g')

  var relationshipGroup = container.append('svg:g')
    .attr('class', 'relationships');

  var peopleGroup = container.append('svg:g')
    .attr('class', 'people');

  var people, rels;

  updateGraph = function() {
    // Filter by relationship type filter
    var relations = relationships.filter(function(rel) {
      return relFilter.get(rel.relationship);
    });

    // Filter people by relations
    var peeps = names.values().filter(function(person) {
      return relations.filter(function(rel) { return  rel.source.name == person.name || rel.target.name == person.name; }).length > 0;
    });

    // Each person has an group element
    people = peopleGroup.selectAll('g.person')
      .data(peeps);

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
      });

    // The bubbles are fit to the text
    group.selectAll('text').each(function() {
       var bbox = this.getBBox();
       if (bbox.width > personRadius)
         personRadius = bbox.width/2 + 20;
    });

    // People's circles are resized
    people
      .each(function(person) {
        d3.select(this).select('circle')
          .attr('r', personRadius);
      });

    people.exit().remove();

    // People have relationships
    rels = relationshipGroup.selectAll('line.relationship')
      .data(relations);

    // Relationships are given lines
    rels.enter().append('svg:line')

    rels.exit().remove();

    // Relationships are classed, coloured and labelled
    rels
      .attr('class', function(rel) { return 'relationship ' + rel.relationship; })
      .attr('stroke', function(rel) { return relationshipColour(rel.relationship); })
      .attr('source', function(rel) { return rel.source.name; })
      .attr('target', function(rel) { return rel.target.name; })
      
    // Layout the graph 
    var graph = new dagre.Digraph();

    // Add the nodes
    peeps.forEach(function(person) {
      graph.addNode(person.name, {width: personRadius*2, height: personRadius*2});
    })

    // Add the edges
    relations.forEach(function(rel) {
      graph.addEdge(null, rel.source.name, rel.target.name);
    });

    // Calculate the layout
    var layout = dagre.layout()
      .nodeSep(personRadius*2)
      .rankDir("TB")
      .run(graph);

    var maxx = 0, maxy = 0, minx = Infinity, miny = Infinity;
    layout.eachNode(function(name, layout) {
      names.get(name).layout = layout;

      maxx = Math.max(maxx, layout.x);
      maxy = Math.max(maxy, layout.y);
      minx = Math.min(minx, layout.x);
      miny = Math.min(miny, layout.y);
    });

    // Normalize the node positions
    zoom.translate([0,0]);
    zoom.size(1);
    xScale.domain([minx-personRadius, maxx+personRadius]);
    yScale.domain([miny-personRadius, maxy+personRadius]);

    // Apply the layout
    transformGraph();
  }

  updateGraph();

  // Get the set of all relationship types
  var relTypes = d3.set(relationships.map(function(rel) { return rel.relationship}))

  // Create a legend
  var legend = d3.select('.legend-section').append('ul');
  legend
    .attr('class', 'legend');

  // Add the entries
  var entries = legend.selectAll('li')
    .data(relTypes.values());
  
  // Style entries
  entries.enter().append('li')
    .each(function(relType) {
      // Checkbox for hiding/showing relationships in the graph
      d3.select(this).append('input')
        .attr('type', 'checkbox')
        .property('checked', function(d) { return relFilter.get(d) || false; })
        .on('click', function(relType) {
          relFilter.set(relType, this.checked);
          updateGraph();
        })

      // Colour key for identifying the relationship
      d3.select(this).append('span')
        .attr('class', 'colour-key')
        .style('background', relationshipColour(relType));

      // Name of the type of the relationship
      d3.select(this).append('span')
        .text(function(relType) { return relType; });
    })
}

// Determine whether a person's role is a tutor role
function isTutor(person) {
  return person.role === "tutor" || person.role === "industry tutor" || person.role === "group leader";
}
