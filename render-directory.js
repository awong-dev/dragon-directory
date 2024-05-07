// Renders the Dragon Directory into an HTML element based on provided data.
//
// This is a loadable javascript module that exports one funciton:
//
//    renderStudents(element, column_info, rows)
//
// This will render the data in `rows` under `element` formated based  on
// `column_info`.
//
// The code uses `htm` and `preact` for generating HTML. Full-scale React
// would have also been a good choice, but that would have required more
// setup with either a bundler + a build pipeline or loading babel into the
// browser.
//
// Using preact means there are no extra steps in the deploy and standard
// static file hosting (such as github pages) is sufficient for providing
// this JS file directly. The simplicity (including not using minification)
// makes it easier for future folks to debug and maintain.

import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.module.js'

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

function normalizeText(value) {
   if (!value || value.trim() === "Unspecified") {
     return "";
   }

   return value.trim();
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

  const neighborhood_school = unspecifiedToEmpty(record['Neighborhood School'].trim());
  const bus_route = unspecifiedToEmpty(record['Bus Route'].trim());

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

// Using the fieldMapping which lists the `field_id` index `row` that
// Returns an array of objects parents in the row.
//
// Example return:
//  [
//     { parent_name: "Some Parent", email: "an@email.com", phone: "123-456-7890" },
//     ...
//  ]
function rowToParents(row, fieldMapping) {
  const parents = [];
  for (const parent_fields of fieldMapping.parents) {
    const parent_name = Object.keys(parent_fields.name_inputs).map(input_id => row[input_id]).join(' ').trim();
    if (parent_name) {
      const phone = normalizeText(row[parent_fields.phone]);
      const email = normalizeText(row[parent_fields.email]);
      parents.push({parent_name, email, phone});
    }
  }
  return parents;
}

// Returns an array of objects representing each student in the row.
//
// Example return:
// [
//   {
//     student_name: "Some Name",
//     neighborhood_school: "Some School",
//     bus_route: "123",
//     grade: 3,
//     teacher: "Teacher Name",
//     date_created: [date object],
//     date_updated: [date object],
//     parents: [
//        { parent_name: "Some Parent", email: "an@email.com", phone: "123-456-7890" },
//        ...
//     ]
//   },
//   ...
// ]
function rowToStudents(row, fieldMapping) {
  const parents = rowToParents(row, fieldMapping);
  const students = [];

  const neighborhood_school = normalizeText(row[fieldMapping.neibhorhood_school]);
  const bus_route = normalizeText(row[fieldMapping.bus_route]);
  const date_updated = new Date(row[fieldMapping.date_updated]);
  const date_created = new Date(row[fieldMapping.date_created]);

  for (const student_field of fieldMapping.students) {
    const student_name = Object.keys(student_field.name_inputs).map(input_id => row[input_id]).join(' ').trim();
    if (student_name) {
      const grade = normalizeText(row[student_field.grade]);
      const teacher = normalizeText(row[student_field.teacher]);
      students.push({ student_name, grade, teacher, neighborhood_school, bus_route, date_updated, parents });
    }
  }

  return students;
}

function fieldIdForLabel(columnInfo, label) {
  for (const [fieldId, info] of Object.entries(columnInfo)) {
    if (info.label === label) {
      return fieldId;
    }
  }

  return -1;
}

function inputsForLabel(columnInfo, label) {
  for (const [fieldId, info] of Object.entries(columnInfo)) {
    if (info.label === label && info.hasOwnProperty('inputs')) {
      return info['inputs'];
    }
  }

  return [];
}

function makeFieldMapping(columnInfo) {
  const fieldMapping = {
      date_updated: fieldIdForLabel(columnInfo, 'meta:date_updated'),
      date_created: fieldIdForLabel(columnInfo, 'meta:date_created'),
      bus_route: fieldIdForLabel(columnInfo, 'Bus Route'),
      neighborhood_school: fieldIdForLabel(columnInfo, 'Neighborhood School'),

      students: [],
      parents: [],
  };
  for (let i = 1; i <= 4; i++) {
    fieldMapping.students.push({
      name_inputs: inputsForLabel(columnInfo, `Student #${i} Name`),
      grade: fieldIdForLabel(columnInfo, `Student #${i} Grade Level`),
      teacher: fieldIdForLabel(columnInfo, `Student #${i} Teacher`),
    });

    fieldMapping.parents.push({
      name_inputs: inputsForLabel(columnInfo, `Parent / Guardian #${i} Name`),
      email: fieldIdForLabel(columnInfo, `Parent / Guardian #${i} Email`),
      phone: fieldIdForLabel(columnInfo, `Parent / Guardian #${i} Phone`),
    });
  }
  return fieldMapping;
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

function by_teacher_comparator([a_k,a_v], [b_k,b_v]) {
  if (a_v[0].grade < b_v[0].grade) {
    return -1;
  }
  if (a_v[0].grade > b_v[0].grade) {
    return 1;
  }

  if (a_k < b_k) {
    return -1;
  }

  if (a_k > b_k) {
    return 1;
  }

  return 0;
}

function renderStudentsOld(target_element, column_info, rows) {
  const students = extract_to_students(raw_csv);
  const groups = group_students(students);
  const by_teacher = Object.entries(groups.by_teacher);

  by_teacher.sort(by_teacher_comparator);

  render(by_teacher.map(([k,v]) => {
      // TODO: This sorts global data structrure... do we care?
      v.sort((a,b) => (a.student_name > b.student_name) ? 1 : ((b.student_name > a.student_name) ? -1 : 0));

      return (html`
          <section class="teacher-card">
            <header class="teacher">${v[0].teacher} - Grade ${v[0].grade}</header>
            <ul class="classlist">
              ${v.map(student => {
                  if (student.in_dragon_directory) {
                      return (html`
                          <li class="student-entry">
                              <header>${student.student_name}</header>
                              <div class="student-info">
                                  ${student.parents.map(p => html`
                                      <div class="parent-info">
                                          <div class="name">${p.parent_name}</div>
                                          <div class="phone"><a href="tel:${p.phone}">${p.phone}</a></div>
                                          <div class="email"><a href="mailto:${p.email}">${p.email}</a></div>
                                      <//>
                                    `)}
                                  ${student.neighborhood_school && html`<div class="nh-school-info"><div>Neighborhood School</div> ${student.neighborhood_school}</div>`}
                                  ${student.bus_route && html`<div class="bus-info"><div>Bus Route</div> ${student.bus_route}</div>`}
                              </div>
                          </li>
                      `);
                   }
                })
              }
            </ul>
          </section>
      `);
    }), target_element);
}

function renderField(id, info, row) {
    if (info.hasOwnProperty['inputs']) {
      // Complex field. Should format differently between Names and addresses
      // but until someone has addresses, not bothering.
      return Object.keys(info['inputs']).map(v => row[v['id']]).join(' ');
    }

    // Fields without 'inputs' are directly stored in the row.
    if (row[id]) {
      return row[id];
    }
    return '';
}

function renderCell(id, info, row) {
    const field = renderField(id, info, row);
    if (field) {
        return html`<td>${field}</td>`;
    }

    return '';
}


const Controls = () => html`<nav>Nav bar</nav>`;
const StudentInfo = ({student_info}) => {
  return html`
    <div class="student-info">
      ${student_info.parents.map(p => html`
          <div class="parent-info">
              <div class="name">${p.parent_name}<//>
              <div class="phone"><a href="tel:${p.phone}">${p.phone}</a><//>
              <div class="email"><a href="mailto:${p.email}">${p.email}</a><//>
          <//>
      `)}
    <//>
  `;
};

const StudentTable = ({students}) => {
    return html`<table>
        ${Object.entries(students).map(([student_name, student_info]) => (
            html`<tr><td>${student_name}</td><td><${StudentInfo} student_info=${student_info} /></td>
            </tr>`
        ))}
        </table>
    `;
};

// Top level app container. Holds state.
class App extends Component {
    state = { sort: 'teacher' };
    constructor() {
        super();
        this.state = { sort: 'teacher' };
    }

    render({students}, state) {
        return html`
            <div class="directory-container">
                <${Controls} />
                <${StudentTable} students=${students} />
            </div>
        `;
    }
};

function renderStudents(target_element, column_info, rows) {
  target_element.innerHTML = '';
  const students = {};

  const fieldMapping = makeFieldMapping(column_info);
  for (const row of rows) {
    for (const s of rowToStudents(row, fieldMapping)) {
      // TODO: Only update if row is newer.
      students[s.student_name] = s;
    }
  }
  window.students = students;

  render(html`<${App} students=${students} />`, target_element);
}

export { renderStudents };
