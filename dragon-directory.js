import { parse } from 'https://cdn.jsdelivr.net/npm/csv-parse@5.5.2/dist/esm/sync.js';

// A record can contain up to 4 parent/guardian information sets.
//
// The entry for parents is structured as follows:
//  "Parent / Guardian #1 Name (Prefix)"
//  "Parent / Guardian #1 Name (First)"
//  "Parent / Guardian #1 Name (Middle)"
//  "Parent / Guardian #1 Name (Last)"
//  "Parent / Guardian #1 Name (Suffix)"
//  "Parent / Guardian #1 Email"
//  "Parent / Guardian #1 Phone"
//  "Interest in Volunteering?"
//  "Are you interested in officially joining the PTA at a voting member?"
//  "Can we include your email in the classroom email list?"
//
// Return an array of objects with the structure
// {
//   parent_name: "",
//   email: "",
//   phone: "",
//   in_room_list: true,
//   volunteer_interest: true,
//   pta_interest: true,
//   orig_entry_id: ""
//   orig_entry_date: ""
// }
function extract_parents(record) {
  const parents = [];

  const in_room_list = record['Can we include your email in the classroom email list?'].trim() === 'Yes';
  const volunteer_interest = record['Interest in Volunteering?'].trim();
  const pta_interest = record['Are you interested in officially joining the PTA at a voting member?'].trim();
  const in_dragon_directory = record['Include your family in the Dragon Directory?'].trim() === 'Yes';
  const orig_entry_id = record['Entry Id'].trim();
  const orig_entry_date = new Date(record['Entry Date'].trim());

  for (let i = 1; i <= 4; i++) {
    const parent_name = [
      record[`Parent / Guardian #${i} Name (Prefix)`],
      record[`Parent / Guardian #${i} Name (First)`],
      record[`Parent / Guardian #${i} Name (Middle)`],
      record[`Parent / Guardian #${i} Name (Last)`],
      record[`Parent / Guardian #${i} Name (Suffix)`],
    ].filter((x) => x.trim() !== "").join(' ').trim();
      const email = record[`Parent / Guardian #${i} Email`].trim();
      const phone = record[`Parent / Guardian #${i} Phone`].trim();

      if (parent_name !== "") {
        parents.push({ parent_name, email, phone, in_room_list, volunteer_interest, pta_interest, in_dragon_directory, orig_entry_id, orig_entry_date });
      }
  }

  return parents;
}

// A record can contain up to 4 student information sets.
//
// The entries for students is is structured as follows:
//  "Student #1 Name (Prefix)"
//  "Student #1 Name (First)"
//  "Student #1 Name (Middle)"
//  "Student #1 Name (Last)"
//  "Student #1 Name (Suffix)"
//  "Student #1 Grade Level"
//  "Student #1 Teacher"
//  "Include your family in the Dragon Directory?"
//  "Neighborhood School"
//  "Bus Route"
//  "Entry Id"
//  "Entry Date"
//
// This function will return an array of student objects WITHOUT the parent field.
// It will be structured as follows
// {
//   student_name: "",
//   grade: 1,
//   teacher: "",
//   parents: [{name:"", email: "", phone: ""}],
//   neighborhood_school: "",
//   bus_route: 1,
//   in_dragon_directory: true,
//   orig_entry_id: ""
//   orig_entry_date: ""
// }
function extract_students(record) {
  const students = [];

  const neighborhood_school = record['Neighborhood School'].trim();
  const bus_route = record['Bus Route'].trim();

  const in_dragon_directory = record['Include your family in the Dragon Directory?'].trim() === 'Yes';
  const orig_entry_id = record['Entry Id'].trim();
  const orig_entry_date = new Date(record['Entry Date'].trim());

  for (let i = 1; i <= 4; i++) {
    const student_name = [
      record[`Student #${i} Name (Prefix)`],
      record[`Student #${i} Name (First)`],
      record[`Student #${i} Name (Middle)`],
      record[`Student #${i} Name (Last)`],
      record[`Student #${i} Name (Suffix)`],
    ].filter((x) => x.trim() !== "").join(' ').trim();
      const grade = record[`Student #${i} Grade Level`].trim();
      const teacher = record[`Student #${i} Teacher`].trim();
      if (student_name !== "") {
        students.push({ student_name, grade, teacher, neighborhood_school, bus_route, in_dragon_directory, orig_entry_date, orig_entry_date  });
      }
  }

  return students;
}

// Turns record into an array of student objects.
function record_to_students(record) {
  const parents = extract_parents(record);
  const students = extract_students(record);

  for (const s of students) {
    s.parents = parents;
  }

  return students;
}

// Takes a csv file and returns an array of student objects.
// Note that there may be duplicates.
// grouped by bus route, by teacher, and by neighborhood school.
function extract_to_students(raw_csv) {
  // Gravity forms has a random codepoint before the BOM. Strip it out.
  // TODO: Test to ensure it's not a quote or a bom.  Frankly, we should eat until the first quote.
  raw_csv = raw_csv.slice(1);

  // Parse the CSV into records.
  const records = parse(raw_csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true
  });

  const students = [];
  for (const r of records) {
    students.push(...record_to_students(r));
  }

  return students;
}

// Returns students grouped by bus;
function group_by_bus(students) {
  const results = {};

  for (const s of students) {
    const bus_route = s.bus_route || 'No Bus';
    if (results.hasOwnProperty(bus_route)) {
      results[bus_route].push(s);
    } else {
      results[bus_route] = [ s ];
    }
  }

  return results;
}

// Returns students grouped by neighborhood school.
function group_by_school(students) {
  const results = {};

  for (const s of students) {
    const school = s.neighborhood_school || 'Unknown School';
    if (results.hasOwnProperty(school)) {
      results[school].push(s);
    } else {
      results[school] = [ s ];
    }
  }

  return results;
}

// Returns students grouped by teacher. The object key
// is the teacher last name, first name, and grade.
function group_by_teacher(students) {
  const results = {};

  for (const s of students) {
    // Sort by last-name first.
    const teacher_sort_key = s.teacher.split(' ').map(x => x.trim()).filter(x => x !== '');

    if (teacher_sort_key.length === 0) {
      teacher_sort_key.push('Unknown Teacher');
    } else {
      const last_name = teacher_sort_key.pop();
      teacher_sort_key.unshift(last_name);
    }

    teacher_sort_key.push(s.grade || 'Unknown Grade');

    if (results.hasOwnProperty(teacher_sort_key)) {
      results[teacher_sort_key].push(s);
    } else {
      results[teacher_sort_key] = [ s ];
    }
  }

  return results;
}

// Returns an object with students grouped by bus, school, and teacher.
function group_students(students) {
  const by_bus = group_by_bus(students);
  const by_school = group_by_school(students);
  const by_teacher = group_by_teacher(students);

  return { by_teacher, by_bus, by_school };
}

/*
async function main() {
  const {values, positionals} = parseArgs({
    options: {
      dedupe: { type: "boolean", short: "d", },
    },
    allowPositionals: true
  });

  if (!positionals[0]) {
    console.error("Missing <csv file>");
    process.exit(1);
  }

  let students = extract_to_students(positionals[0]);

  if (values.dedupe) {
    students = await dedupe(students);
  }

//  console.log(JSON.stringify(students, null, 2));

  const doc = new jsPDF({
    orientation: "portrait",
    format: 'letter',
    unit: "in",
    compress: true,
  });

  for (const s of students) {
    console.log({text: s.student_name, x: 1, y: 1});
    doc.text(s.student_name, 1, 1);
  }

  doc.save("output.pdf");
};
*/

window.dragonDirectory = { extract_to_students, group_students };
