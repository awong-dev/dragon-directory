import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

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

function main() {
  if (process.argv.length !== 4) {
    console.error('Expected input filename!');
    process.exit(1);
  }

  // Gravity forms has a random codepoint before the BOM. Strip it out.
  // TODO: Test to ensure it's not a quote or a bom.  Frankly, we should eat until the first quote.
  const raw_csv = fs.readFileSync(process.argv[2],
      { encoding: 'utf8', flag: 'r' }).slice(1);

  // Parse the CSV into records.
  const records = parse(raw_csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true
  });

  const directory_info = {
    by_class: {},
    by_bus: {},
    by_school: {},
  };

  const students = [];
  for (const r of records) {
    students.push(...record_to_students(r));
  }

  console.log(students[0]);
  console.log(students[10]);
  console.log(students[18]);
}

main();
