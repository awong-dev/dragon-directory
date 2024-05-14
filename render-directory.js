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

import { html, render, Component, useState } from 'https://unpkg.com/htm/preact/standalone.module.js'

// Parse the fragment into query parameters.
function parseFragment() {
  const params = {};
  if (window.location.hash) {
    const fragment = window.location.hash.slice(1);
    for (const keyValue of fragment.split('&')) {
      const [key, value] = keyValue.split('=');
      params[key] = value;
    }
  }
  return params;
}

// Ensures returned text is trimmed and things like missing fileds
// or "Unspecified" comes back as an emptry string.
function normalizeText(value) {
   if (!value) {
     return "";
   }

   const trimmed = value.trim();
   if (trimmed === "Unspecified") {
     return "";
   }

   return trimmed;
}

// Takes the `columnInfo` given to `renderStudents()` and produces
// an object whose keys maps to the fieldIds corresponding to the information
// the key wants.  These fieldIds can then be used with the `rows` in
// `renderStudents()` to retrieve that wanted data.
//
// This object is basically the projection of columnInfo into the semantic
// concepts used for constructing a Student object.
function makeFieldMapping(columnInfo) {
  const fieldMapping = {
      bus_route: fieldIdForLabel(columnInfo, 'Bus Route'),
      neighborhood_school: fieldIdForLabel(columnInfo, 'Neighborhood School'),

      students: [],
      parents: [],

      // These are synthetic fields insred in the PHP side with an artificial
      // label header 'meta:' to distinguish.
      date_updated: fieldIdForLabel(columnInfo, 'meta:date_updated'),
      date_created: fieldIdForLabel(columnInfo, 'meta:date_created'),
      entry_id: fieldIdForLabel(columnInfo, 'meta:entry_id'),
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

// Using the fieldMapping which lists the `fieldId` index `row` that
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

  const neighborhood_school = normalizeText(row[fieldMapping.neighborhood_school]);
  const bus_route = normalizeText(row[fieldMapping.bus_route]);
  const entry_id = normalizeText(row[fieldMapping.entry_id]);
  const date_created = new Date(row[fieldMapping.date_created]);
  const date_updated = new Date(row[fieldMapping.date_updated]);

  for (const student_field of fieldMapping.students) {
    const student_name = Object.keys(student_field.name_inputs).map(input_id => row[input_id]).join(' ').trim();
    if (student_name) {
      const grade = normalizeText(row[student_field.grade]);
      const teacher = normalizeText(row[student_field.teacher]);
      students.push({
          student_name,
          grade,
          teacher,
          neighborhood_school,
          bus_route,
          parents,
          entry_id,
          date_created,
          date_updated,
          });
    }
  }

  return students;
}

// Helper function to extract the fieldId from columnInfo that matches
// the given label.
//
// Returns -1 on error which will not match any fields.
function fieldIdForLabel(columnInfo, label) {
  for (const [fieldId, info] of Object.entries(columnInfo)) {
    if (info.label === label) {
      return fieldId;
    }
  }

  return -1;
}

// Helper function to extract an array of fieldIds from columnInfo that matches
// the set of inputs for a given label. This is used for `name` and `address`
// fields where the top-level field_id does not exist in rows. You have to
// compose the content out of all the `inputs`.
//
// Returns -1 on error which will not match any fields.
function inputsForLabel(columnInfo, label) {
  for (const [fieldId, info] of Object.entries(columnInfo)) {
    if (info.label === label && info.hasOwnProperty('inputs')) {
      return info['inputs'];
    }
  }

  return [];
}

// Returns students grouped by bus;
function groupByBus(students) {
  const results = {};

  for (const info of Object.values(students)) {
    const bus_route = info.bus_route || 'No Bus';
    if (results.hasOwnProperty(bus_route)) {
      results[bus_route].push(info);
    } else {
      results[bus_route] = [ info ];
    }
  }

  return Object.entries(results).sort(byGroupNameOrdering);
}

// Returns students grouped by neighborhood school.
function groupBySchool(students) {
  const results = {};

  for (const info of Object.values(students)) {
    const school = info.neighborhood_school || 'Unknown School';
    if (results.hasOwnProperty(school)) {
      results[school].push(info);
    } else {
      results[school] = [ info ];
    }
  }

  return Object.entries(results).sort(byGroupNameOrdering);
}

// Returns students grouped by teacher. The object key
// is the teacher last name, first name, and grade.
function groupByTeacher(students) {
  const grouped = {};

  for (const info of Object.values(students)) {
    // Sort by last-name first.
    const teacher_sort_key = info.teacher.split(' ').map(x => x.trim()).filter(x => x !== '');

    if (teacher_sort_key.length === 0) {
      teacher_sort_key.push('Unknown Teacher');
    } else {
      const last_name = teacher_sort_key.pop();
      teacher_sort_key.unshift(last_name);
    }

    teacher_sort_key.push(info.grade || 'Unknown Grade');

    if (grouped.hasOwnProperty(teacher_sort_key)) {
      grouped[teacher_sort_key].push(info);
    } else {
      grouped[teacher_sort_key] = [ info ];
    }
  }

  return Object.entries(grouped)
      .sort(byTeacherOrdering)
      .map(([_, students]) =>
          [`${students[0].teacher} - Grade ${students[0].grade}`,
           students]);
}

// Returns an object with students grouped by bus, school, and teacher.
function groupStudents(students, groupBy) {
  if (groupBy === "neighborhood_school") {
    return groupBySchool(students);
  } else if (groupBy === "bus_route") {
    return  groupByBus(students);
  }

  // Default to teacher sort.
  return groupByTeacher(students);
}

function getLeftoverGroups(groupBy) {
  if (groupBy === "neighborhood_school") {
    return ["teacher", "bus_route"];
  } else if (groupBy === "bus_route") {
    return ["teacher", "neighborhood_school"];
  }

  // Default to teacher sort.
  return ["neighborhood_school", "bus_route"];
}

function byGroupNameOrdering([a_group,_1],[b_group,_2]) {
  if (a_group == b_group) {
    return 0;
  } else if (a_group < b_group) {
    return -1;
  }
  return 1;
}

// Sort order of teacher cards. Teachers are grouped by grade and then
// listed in alphabetical order.
function byTeacherOrdering([a_teacher,a_students], [b_teacher,b_students]) {
  // Just examine the first student to find the grade.
  if (a_students[0].grade < b_students[0].grade) {
    return -1;
  }
  if (a_students[0].grade > b_students[0].grade) {
    return 1;
  }

  if (a_teacher < b_teacher) {
    return -1;
  }

  if (a_teacher > b_teacher) {
    return 1;
  }

  return 0;
}

// Renders navigation controls.
function Controls({handleClick}) {
  return html`
    <nav class="directory-control">
      <span>Group by: </span>
      <span>
        <a href="#groupby=teacher" onclick=${()=>handleClick("teacher")}>Teacher</a> |
        <a href="#groupby=neighborhood_school" onclick=${()=>handleClick("neighborhood_school")}>Neighborhood School</a> |
        <a href="#groupby=bus_route" onclick=${()=>handleClick("bus_route")}>Bus Route</a> 
      </span>
    </nav>
  `;
}

// Renders the information for a student other than the name.
function StudentInfo({studentInfo}) {
  return html`
    <div class="student-info">
      ${studentInfo.parents.map(p => html`
          <div class="parent-info">
            <div class="name">${p.parent_name}<//>
            <div class="phone"><a href="tel:${p.phone}">${p.phone}</a><//>
            <div class="email"><a href="mailto:${p.email}">${p.email}</a><//>
          <//>
      `)}
    <//>
  `;
}

function StudentNameHeader({formId, leftOver, linkEntries, studentInfo}) {
  const parts = [studentInfo.student_name];
  for (const key of leftOver) {
    if (studentInfo[key]) {
      parts.push(studentInfo[key]);
    }
  }
  if (linkEntries) {
    return html`
      <header>
        <a target="_blank" href=${`/wp-admin/admin.php?page=gf_entries&view=entry&id=${formId}&lid=${studentInfo.entry_id}`}>
          ${parts.join(' - ')}
        </a>
      </header>
    `;
  }

  return html`<header>${parts.join(' - ')}</header>`;
}

// Renders tne entire table for a student.
function StudentTable({formId, leftOver, linkEntries, studentList}) {
    return html`
        <div class="student-table">
          <ul class="student-list">
            ${studentList.map(studentInfo => (html`
              <li class="student-entry" data-updated="${studentInfo.date_updated.toISOString()}" data-entry-id="${studentInfo.entry_id}">
                  <${StudentNameHeader}
                      formId=${formId}
                      studentInfo=${studentInfo}
                      leftOver=${leftOver}
                      linkEntries=${linkEntries} />
                  <${StudentInfo} studentInfo=${studentInfo} />
              <//>`
            ))}
          </ul>
        <//>
    `;
}

function strcmp(a,b) {
  if (a === b) {
    return 0;
  }
  if (a > b) {
    return 1;
  }
  return -1;
}

function GroupedList({formId, students, groupBy, linkEntries}) {
  const grouped = groupStudents(students, groupBy);
  const leftOver = getLeftoverGroups(groupBy);

  return html`
    <div>
      ${grouped.map(([group_name, student_list]) => html`
          <section class="group-card">
            <header>${group_name}</header>
            <${StudentTable}
                formId=${formId}
                leftOver=${leftOver}
                linkEntries=${linkEntries}
                studentList=${student_list.sort(
                    (a,b) => strcmp(a.student_name, b.student_name))} />
          <//>
        `)
      }
    <//>
  `;
}

// Top level container for the Directory. Holds state.
function Directory({allStudents, formId, linkEntries}) {
  const fragmentParams = parseFragment();
  const [groupBy, setGroupBy] = useState(fragmentParams['groupby'] || "teacher");

  return html`
      <div class="directory-container">
          <${Controls} handleClick=${setGroupBy} />
          <${GroupedList} students=${allStudents} formId=${formId} groupBy=${groupBy} linkEntries=${linkEntries} />
      </div>
  `;
}

// Shows the Load Directory control.
function LoadDirectoryControl({tryFetchData, message}) {
  const handleClick = () => {
    tryFetchData(document.getElementById('access-code').value);

    return false; // Do not reload page.
  };

  return html`
    <div class="load-directory-control">
      ${html`<div class="error-message">${message}</div>`}
      <form onSubmit=${handleClick}>
        <label for="access-code">Access Code:</label>
        <input id="access-code" type="password"></input>
        <button id="load-directory-button" type="submit">
        Load Directory
        </button>
      </form>
    <//>
  `;
}

// Shows the loading message.
function LoadingMessage() {
  return html`
    <div class="loading-message">
      Doing laundry...making lunch... Will load data eventually...
    <//>
  `;
}

const promisedSleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const ADMIN_PREFIX="admin:";

// Shows the loading message.
function App({entriesEndpoint, syntheticData}) {
  const [allStudents, setAllStudents] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formId, setFormId] = useState('');
  const [linkEntries, setLinkEntries] = useState(false);

  const parseData = (data) => {
      const fieldMapping = makeFieldMapping(data['column_info']);
      const newAllStudents = {};
      for (const row of data['rows']) {
        for (const s of rowToStudents(row, fieldMapping)) {
          // Let newer entries for a student overwrite older ones.
          if (!newAllStudents.hasOwnProperty(s.student_name) ||
               newAllStudents[s.student_name].date_updated < s.date_updated) {
            newAllStudents[s.student_name] = s;
          }
        }
      }

      setAllStudents(newAllStudents);
      setFormId(data['form_id']);
  };

  const tryFetchData = async (accessCode) => {
    setIsLoading(true);

    if (accessCode.startsWith(ADMIN_PREFIX)) {
      setLinkEntries(true);
      accessCode = accessCode.slice(ADMIN_PREFIX.length);
    }

    try {
      // Wait slightly just to be cute.
      await promisedSleep(500);

      if (syntheticData) {
        parseData(syntheticData);
      } else {
        const response = await fetch(
            `${entriesEndpoint}?access_code=${accessCode}`,
            {
              headers: {
                'Accept': 'application/json'
                }
            });

        if (!response.ok) {
          setErrorMessage(`Retrieving Entries failed. Status: ${response.statusText}`);
          return;
        }

        parseData(await response.json());
      }
    } catch (e) {
      setErrorMessage(`Unknown failure: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!allStudents) {
    if (isLoading) {
      return html`
        <${LoadingMessage} />
      `;
    }

    return html`
      <${LoadDirectoryControl} tryFetchData=${tryFetchData} message=${errorMessage} />
    `;
  }

  return html`
    <${Directory} allStudents=${allStudents} formId=${formId} linkEntries=${linkEntries} />
  `;
}

function renderDirectory(entriesEndpoint, target_element, syntheticData) {
  target_element.innerHTML = '';
  render(html`<${App} entriesEndpoint=${entriesEndpoint} syntheticData=${syntheticData} />`, target_element);
}

async function loadCss(cssUrl) {
  const cssLink = document.createElement('link');
  cssLink.href = cssUrl;
  cssLink.type = 'text/css';
  cssLink.rel = 'stylesheet';
  cssLink.media = 'screen,print';
  document.getElementsByTagName('head')[0].appendChild(cssLink);
}

export { loadCss, renderDirectory };
