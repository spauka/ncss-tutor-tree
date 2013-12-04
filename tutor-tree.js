queue()
  .defer(d3.csv, 'NCSS2009.csv')
  .defer(d3.csv, 'NCSS2010.csv')
  .defer(d3.csv, 'NCSS2011.csv')
//  .defer(d3.csv, 'NCSS2012.csv')
//  .defer(d3.csv, 'NCSS2013.csv')
  .await(loadNCSSTree)

// A list of people's names
var names = d3.set();
// A map of the tutors by group and year
var groupTutors = d3.map();
// A map of who has been tutored by who
var tutoredBy = d3.map();
// A map of who has tutored in the same group
var tutoredWith = d3.map();

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
      names.add(person.name);
    });
  });

  console.log(groupTutors);

  // Build the tutoredBy and tutoredWith maps
  trees.forEach(function(tree, year) {
    year += 2009;

    tree.forEach(function(person) {
      // Build the tutoredWith map
      if (isTutor(person)) {
        // Get the list of people this person tutored with
        var tutoredWithPerson = tutoredWith.get(person.name);

        // If the list is undefined create a new one
        if (tutoredWithPerson === undefined)
          tutoredWithPerson = tutoredWith.set(person.name, d3.map());

        // Add this year's list of tutors to the people tutored with
        var fellowTutors = groupTutors.get(year).get(person.group);
        tutoredWithPerson.set(year, fellowTutors);
      }

      // Build the tutoredBy map
      else if (person.role === "student") {
        // Get the list of people this person was tutored by
        var personTutoredBy = tutoredBy.get(person.name);

        // If the list is undefined create a new one
        if (personTutoredBy === undefined)
          personTutoredBy = tutoredBy.set(person.name, d3.map());

        // Add this year's list of tutors to the tutors tutored by
        var tutors = groupTutors.get(year).get(person.group);
        personTutoredBy.set(year, tutors);
      }
    });
  });

  console.log(tutoredWith);
  console.log(tutoredBy);

  // Create the graph visualization

  // SVG element
  var svg = d3.select('body').append('svg');
  
  // Groups of elements
  var peopleGroup = svg.append('svg:g')
    .attr('class', 'people');

  updateGraph = function() {
    // Each person has an group element
    var people = peopleGroup.selectAll('g.person')
      .data(names.values());

    // People get given a group element when they start NCSS
    var group = people.enter().append('svg:g')
      .attr('class', 'person');
    // ...with a rectangle
    group.append('svg:rect')
      .attr('width', 200)
      .attr('height', 50);
    // ...and a label for their name
    group.append('svg:text')
      .attr('fill', 'white')
      .attr('dx', 10)
      .attr('dy', 25);

    // People's elements are positioned
    people
      .attr('title', function(name) { return name; })
      .attr('transform', function(name, i) { return 'translate(200, '+(i*60)+')'; })
      .each(function(name) {
        // ...and are labelled with their names
        d3.select(this).select('text')
          .text(function(name) { return name; })
      });


    // People tutor with a set of people each year
    var fellowTutors = people.selectAll('g.tutored-with')
      .data(function(name) { 
        var tutorsByYear = tutoredWith.get(name);
        if (tutorsByYear)
          return tutorsByYear.values();
        else
          return [];
      })

    fellowTutors.enter().append('svg:g')
      .attr('class', 'tutored-with');

    // Each year has a set of fellow tutors
    var fellowTutorsByYear = fellowTutors.selectAll('path.fellow-tutor')
      .data(function(tutors) { return tutors; })

    // Each tutoring relationship gets a path when commenced
    fellowTutorsByYear.enter().append('svg:path')
      .attr('class', 'fellow-tutor');

    // Each tutoring relationship is labelled
    fellowTutorsByYear
      .attr('name', function(tutor) { return tutor.name } );
  }

  updateGraph();
}

// Determine whether a person's role is a tutor role
function isTutor(person) {
  return person.role === "tutor" || person.role === "industry tutor" || person.role === "group leader";
}
