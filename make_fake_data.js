import fs from 'fs';
import { faker } from '@faker-js/faker';
const column_info = JSON.parse(fs.readFileSync('./column-info.json', 'utf8'));

const BUS = [
  "688",
  "634",
  "333",
  "123",
];

const SCHOOL = [
  "School A",
  "School B",
  "School C",
  "School D",
  "School u",
];

const TEACHERS = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
};

const TEACHERS_PER_GRADE = 3;

for (let i=0; i < TEACHERS_PER_GRADE; i++) {
  TEACHERS[1].push(faker.person.fullName());
  TEACHERS[2].push(faker.person.fullName());
  TEACHERS[3].push(faker.person.fullName());
  TEACHERS[4].push(faker.person.fullName());
  TEACHERS[5].push(faker.person.fullName());
}

function randomTeacherAndGrade() {
  const grade = 1+Math.floor(Math.random() * 5);
  const teacher = TEACHERS[grade][Math.floor(Math.random()*TEACHERS_PER_GRADE)];
  return {grade: grade.toString(), teacher};
}

function randomSchool() {
  return SCHOOL[Math.floor(Math.random()*SCHOOL.length)];
}

function randomBus() {
  return BUS[Math.floor(Math.random()*BUS.length)];
}

let nextEntryId = 100;
function createFakeRow(numParents, numStudents) {
   const row = {};

   if (numParents > 0) {
     // Parent #1
     row["2.3"] = faker.person.firstName();
     row["2.6"] = faker.person.lastName();
     row["3"] = faker.internet.email();
     row["4"] = faker.phone.number();
   }
   if (numParents > 1) {
     // Parent #2
     row["8.3"] = faker.person.firstName();
     row["8.6"] = faker.person.lastName();
     row["9"] = faker.internet.email();
     row["5"] = faker.phone.number();
   }
   if (numParents > 2) {
     // Parent #3
     row["11.3"] = faker.person.firstName();
     row["11.6"] = faker.person.lastName();
     row["13"] = faker.internet.email();
     row["12"] = faker.phone.number();
   }
   if (numParents > 3) {
     // Parent #4
     row["45.3"] = faker.person.firstName();
     row["45.6"] = faker.person.lastName();
     row["46"] = faker.internet.email();
     row["47"] = faker.phone.number();
   }

   if (numStudents > 0) {
     const {grade, teacher} = randomTeacherAndGrade();

     // Student #1
     row["17.3"] = faker.person.firstName();
     row["17.6"] = faker.person.lastName();
     row["18"] = grade;
     row["19"] = teacher;
   }
   if (numStudents > 1) {
     const {grade, teacher} = randomTeacherAndGrade();

     // Student #2
     row["28.3"] = faker.person.firstName();
     row["28.6"] = faker.person.lastName();
     row["31"] = grade;
     row["34"] = teacher;
   }
   if (numStudents > 2) {
     const {grade, teacher} = randomTeacherAndGrade();

     // Student #3
     row["27.3"] = faker.person.firstName();
     row["27.6"] = faker.person.lastName();
     row["30"] = grade;
     row["33"] = teacher;
   }
   if (numStudents > 3) {
     const {grade, teacher} = randomTeacherAndGrade();

     // Student #3
     row["26.3"] = faker.person.firstName();
     row["26.6"] = faker.person.lastName();
     row["29"] = grade;
     row["32"] = teacher;
   }

   row["54"] = randomSchool();
   row["55"] = randomBus();

   row["date_created"] = "2024-01-11 03:38:52";
   row["date_updated"] = "2024-01-11 03:38:52";
   row['id'] = nextEntryId.toString();
   nextEntryId++;

   return row;
}

const rows = [];
for (let i = 0; i < 100; i++) {
  const numStudents = 1 + Math.floor((Math.random()*4));
  const numParents = 1 + Math.floor((Math.random()*4));
  rows[i] = createFakeRow(numParents, numStudents);
}

const data = {
  "form_id": 24,
  column_info,
  rows
};

console.log(JSON.stringify(data, null, 2));
