queue()
  .defer(d3.csv, 'NCSS2009.csv')
  .defer(d3.csv, 'NCSS2010.csv')
  .defer(d3.csv, 'NCSS2011.csv')
//  .defer(d3.csv, 'NCSS2012.csv')
//  .defer(d3.csv, 'NCSS2013.csv')
  .await(loadNCSSTree)

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
    });
  });

  console.log(groupTutors);

  // Build the tutoredBy and tutoredWith maps
  trees.forEach(function(tree, year) {
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
      }
    });
  });

  console.log(tutoredWith);
}

// Determine whether a person's role is a tutor role
function isTutor(person) {
  return person.role === "tutor" || person.role === "industry tutor" || person.role === "group leader";
}
