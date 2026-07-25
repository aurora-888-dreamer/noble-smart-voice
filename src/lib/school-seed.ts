// Seed data from Stella Maris School — Preschool AY 2026/2027 (uploaded rosters).
// Idempotent: matches classes by name and skips students already present by studentNumberId.
import { getSchoolDb, type KgLevel } from "./school-db";

type Sex = "M" | "F";
interface SeedStudent { sid: string; name: string; sex: Sex }
interface SeedClass {
  name: string;
  level: KgLevel;
  teachers: string[];
  students: SeedStudent[];
}

const CLASSES: SeedClass[] = [
  {
    name: "Toddler - Penguin", level: "toddler", teachers: [],
    students: [
      { sid: "26.27.T.002", name: "Anselmus Herjuan Abhiseva Arsyanendra", sex: "M" },
      { sid: "26.27.T.001", name: "Celine Olivia Suryono", sex: "F" },
      { sid: "26.27.T.007", name: "Ciel Kathlyne Chandrawan", sex: "F" },
      { sid: "26.27.T.012", name: "Claviera Jeanice Wong", sex: "F" },
      { sid: "26.27.T.011", name: "Ebenezer Nathanael", sex: "M" },
      { sid: "26.27.T.005", name: "Edrick Kenzo Wijaya", sex: "M" },
      { sid: "26.27.T.013", name: "Erin Roseanne Halim", sex: "F" },
      { sid: "26.27.T.003", name: "Freyja Minerva Ren", sex: "F" },
      { sid: "25.26.T.007", name: "Glenn Ravelius", sex: "M" },
      { sid: "26.27.T.010", name: "Harvin Davey Aprilries", sex: "M" },
      { sid: "26.27.T.004", name: "Jesse Sean Harsojo", sex: "M" },
      { sid: "26.27.T.014", name: "Miles Ghalibie", sex: "M" },
      { sid: "26.27.T.009", name: "Rendharta Tatsuomi Dimarco", sex: "M" },
      { sid: "26.27.T.006", name: "Ryu Amadeus Harreltan", sex: "M" },
      { sid: "26.27.T.008", name: "Sonia Emmanuella Sandra", sex: "F" },
    ],
  },
  {
    name: "Nursery - Bear", level: "nursery", teachers: ["Ms. Elita", "Ms. Tias"],
    students: [
      { sid: "25.26.T.003", name: "Charlotte Joanna Dharmawan", sex: "F" },
      { sid: "26.27.N.011", name: "Elizabeth Maple Haruna Gurning", sex: "F" },
      { sid: "25.26.T.004", name: "Hailey Valerie Susanto", sex: "F" },
      { sid: "26.27.N.012", name: "Jeremy Madelim", sex: "M" },
      { sid: "26.27.N.009", name: "Kathleen Keira Elska", sex: "F" },
      { sid: "25.26.T.008", name: "Nityam Lohiya", sex: "M" },
      { sid: "25.26.T.006", name: "Noel Marvelous Setiady", sex: "M" },
      { sid: "26.27.N.014", name: "Raphael Suto De Vera", sex: "M" },
      { sid: "26.27.N.015", name: "Riley Zefanya Yaputra", sex: "F" },
      { sid: "26.27.N.016", name: "Thiago Peter ng", sex: "M" },
      { sid: "26.27.N.017", name: "Michaella Audrey Matasak", sex: "F" },
      { sid: "26.27.N.018", name: "Minjie Lee", sex: "M" },
    ],
  },
  {
    name: "Nursery - Bee", level: "nursery", teachers: ["Ms. Hermin", "Ms. Yhoslien"],
    students: [
      { sid: "26.27.N.001", name: "Alfred Timothy Siregar", sex: "M" },
      { sid: "25.26.T.001", name: "Amadeus Rosario", sex: "M" },
      { sid: "25.26.T.002", name: "Benedict Mikael Widjaja", sex: "M" },
      { sid: "26.27.N.002", name: "Daniela Lynnelle Alexandra Nugroho", sex: "F" },
      { sid: "26.27.N.003", name: "Deven Latanuda", sex: "M" },
      { sid: "26.27.N.004", name: "Eiji Dante Sun", sex: "M" },
      { sid: "26.27.N.005", name: "Emslee Kerrin Abbeygail", sex: "F" },
      { sid: "26.27.N.006", name: "Gracella Michelle Hartanto", sex: "F" },
      { sid: "26.27.N.007", name: "Grecia Gwyneira Liwang", sex: "F" },
      { sid: "25.26.T.005", name: "Irene Lumina Kurniawan", sex: "F" },
      { sid: "26.27.N.008", name: "Ji Yoon An", sex: "F" },
      { sid: "26.27.N.013", name: "Kaira Ginela Tjoandaritmo", sex: "F" },
      { sid: "26.27.N.010", name: "Orlando Ignacio Budiwinata", sex: "M" },
    ],
  },
  {
    name: "Kindergarten 1 - Butterfly", level: "k1", teachers: [],
    students: [
      { sid: "25.26.N.009", name: "Andrew Vanko Wijaya", sex: "M" },
      { sid: "26.27.K1.014", name: "Axel Hadi Emmanuel", sex: "M" },
      { sid: "24.25.T.007", name: "Elvano Uriel Prince", sex: "M" },
      { sid: "26.27.K1.009", name: "Frederick Wayne Terutung", sex: "M" },
      { sid: "26.27.K1.015", name: "Hillary Gwen Charlotte", sex: "F" },
      { sid: "25.26.N.002", name: "Immanuel Jayden Kadir", sex: "M" },
      { sid: "25.26.N.012", name: "Kaneishia Fredella Danesputri", sex: "F" },
      { sid: "26.27.K1.011", name: "Klaus Neil Jeremiah", sex: "M" },
      { sid: "26.27.K1.013", name: "Manuel Zionathan", sex: "M" },
      { sid: "25.26.N.003", name: "Nasya Margaret Kristianto", sex: "F" },
      { sid: "26.27.K1.010", name: "Nolan Faith Sumardi", sex: "M" },
      { sid: "26.27.K1.012", name: "Reynardus Jonathan Ferryandi", sex: "M" },
      { sid: "25.26.N.013", name: "Sam Alexander", sex: "M" },
      { sid: "25.26.N.006", name: "Sheikha Raline Zaina", sex: "F" },
      { sid: "24.25.T.005", name: "Valerie Mischa Wijaya", sex: "F" },
    ],
  },
  {
    name: "Kindergarten 1 - Horse", level: "k1", teachers: [],
    students: [
      { sid: "24.25.T.001", name: "Calla Sutan", sex: "F" },
      { sid: "25.26.N.010", name: "Chloe Arcelia Theodore", sex: "F" },
      { sid: "26.27.K1.007", name: "Darren Austin Adhitama", sex: "M" },
      { sid: "25.26.N.011", name: "Gamaliel Hope Sugianto", sex: "M" },
      { sid: "26.27.K1.002", name: "Hezekiah Rafael", sex: "M" },
      { sid: "26.27.K1.005", name: "Kenzo Shankara Wijaya", sex: "M" },
      { sid: "26.27.K1.003", name: "Kiana Andrean Notonegoro", sex: "F" },
      { sid: "26.27.K1.004", name: "Naevia Aracelyne Audemars Wardana", sex: "F" },
      { sid: "26.27.K1.001", name: "Nicholas Erick Sutrisno", sex: "M" },
      { sid: "26.27.K1.006", name: "Reizelle Ryder Young", sex: "F" },
      { sid: "25.26.N.004", name: "Richard Clayton Sutanto", sex: "M" },
      { sid: "25.26.N.005", name: "River Jayden Yaputra", sex: "M" },
      { sid: "26.27.K1.008", name: "Roderick Wesley Terutung", sex: "M" },
      { sid: "24.25.T.004", name: "San Napoleon", sex: "M" },
      { sid: "25.26.N.016", name: "Swarna Bhatnagar", sex: "F" },
    ],
  },
  {
    name: "Kindergarten 1 - Eagle", level: "k1", teachers: ["Ms. Edith"],
    students: [
      { sid: "25.26.N.008", name: "Ainsley Winifred Sudiro", sex: "F" },
      { sid: "26.27.K1.019", name: "Ben Elvan Flambo", sex: "M" },
      { sid: "26.27.K1.022", name: "Ezra Giovanno", sex: "M" },
      { sid: "26.27.K1.020", name: "Garren Gwenael Liwang", sex: "M" },
      { sid: "25.26.N.001", name: "Genevieve Eloise Daniella Sisco", sex: "F" },
      { sid: "26.27.K1.017", name: "Gracielle Christie", sex: "F" },
      { sid: "24.25.T.002", name: "Jocelyn Jean", sex: "F" },
      { sid: "26.27.K1.016", name: "Josephine Glory Kurniawan", sex: "F" },
      { sid: "23.24.T.008", name: "Li Youan (Chris)", sex: "M" },
      { sid: "25.26.N.017", name: "Lucca Kyle Fang", sex: "M" },
      { sid: "26.27.K1.021", name: "Miguel Abqary", sex: "M" },
      { sid: "24.25.T.003", name: "Mikael Sentosa Wigin", sex: "M" },
      { sid: "26.27.K1.023", name: "Richardza Pamelo Lee", sex: "M" },
      { sid: "26.27.K1.018", name: "Thercio Montana Chandrawan", sex: "M" },
      { sid: "25.26.N.007", name: "Valencia Widisetyanto", sex: "F" },
    ],
  },
  {
    name: "Kindergarten 2 - Dolphin", level: "k2", teachers: ["Ms. Ruth", "Ms. Lorelie"],
    students: [
      { sid: "26.27.K2.005", name: "Aaron Yuankai Liu", sex: "F" },
      { sid: "23.24.T.001", name: "Akio Kanaka Tantiono", sex: "M" },
      { sid: "24.25.N.011", name: "Andrew Immanuel Johan", sex: "M" },
      { sid: "24.25.N.002", name: "Catlynn Mikaela Hadi", sex: "F" },
      { sid: "23.24.T.003", name: "Clairyne Olivia Tjiu", sex: "F" },
      { sid: "24.25.N.014", name: "Haruka Hana Keona", sex: "F" },
      { sid: "24.25.N.004", name: "Hyachinta Mariscotti Illona Phoebe", sex: "F" },
      { sid: "24.25.N.016", name: "Kenzie Kane Lie", sex: "M" },
      { sid: "24.25.N.017", name: "Kimberly Elaine Luhur", sex: "F" },
      { sid: "25.26.K1.014", name: "Kizashi Yoshinaga", sex: "F" },
      { sid: "25.26.K1.004", name: "Krishana Lydia Sihotang", sex: "F" },
      { sid: "24.25.N.009", name: "Nicholas Kane Wijaya", sex: "M" },
      { sid: "24.25.N.007", name: "Lucio Hanaka Phung", sex: "M" },
      { sid: "24.25.N.019", name: "Marvelio Gevariel Vinesian", sex: "M" },
      { sid: "25.26.K1.016", name: "Sada Frederika Siringoringo", sex: "F" },
    ],
  },
  {
    name: "Kindergarten 2 - Rabbit", level: "k2", teachers: ["Ms. Bella", "Ms. Yuni S"],
    students: [
      { sid: "26.27.K2.004", name: "Aeryn Xinkai Liu", sex: "F" },
      { sid: "23.24.T.002", name: "Arsen Arshavin Liam Murfih", sex: "M" },
      { sid: "24.25.N.012", name: "Clairine Arrabella Sulistyawan", sex: "F" },
      { sid: "25.26.K1.008", name: "Daniel Elvano Lalu Baghi", sex: "M" },
      { sid: "26.27.K2.003", name: "Elvina Brielle Aritonang", sex: "F" },
      { sid: "24.25.N.013", name: "Ferixel Pratama Sembhaji", sex: "M" },
      { sid: "25.26.K1.018", name: "Freya Lonicka Laddran Borromeo", sex: "F" },
      { sid: "26.27.K2.002", name: "Gwen Aurelia Gosiddhy", sex: "F" },
      { sid: "25.26.K1.002", name: "Gwenida Morita", sex: "F" },
      { sid: "25.26.K1.009", name: "Isaiah Nawasena Siahaan", sex: "M" },
      { sid: "25.26.K1.013", name: "Jonetta Leon Tjoa", sex: "F" },
      { sid: "24.25.N.006", name: "Kennan Arion Suto", sex: "M" },
      { sid: "25.26.K1.011", name: "Michelle Glyvechia Aileen", sex: "F" },
      { sid: "25.26.K1.006", name: "Mileva Arelie Hutapea", sex: "F" },
      { sid: "25.26.K1.015", name: "Owen Waldemar Nugroho", sex: "M" },
      { sid: "23.24.T.005", name: "Rey Emmanuel Yaprimadi", sex: "M" },
    ],
  },
  {
    name: "Kindergarten 2 - Dove", level: "k2", teachers: [],
    students: [
      { sid: "25.26.K1.001", name: "Brandon Asher Suparman", sex: "M" },
      { sid: "24.25.N.001", name: "Braxton Flynn Suliarta", sex: "M" },
      { sid: "25.26.K1.007", name: "Claire Ronley Limner", sex: "F" },
      { sid: "23.24.T.006", name: "Edward Kenneth Wijaya", sex: "M" },
      { sid: "25.26.K1.017", name: "Eva Sreyas", sex: "F" },
      { sid: "24.25.N.003", name: "Gertrude Gizaka Zeta", sex: "F" },
      { sid: "25.26.K1.003", name: "Gwyneth Giana Raharja", sex: "F" },
      { sid: "25.26.K1.012", name: "Isabella Sherynne Pratama", sex: "F" },
      { sid: "24.25.N.015", name: "Javier Kuswanto", sex: "M" },
      { sid: "24.25.N.005", name: "Jeconia Alvaro Pratama", sex: "M" },
      { sid: "24.25.N.021", name: "Jillian Abigail Calim", sex: "F" },
      { sid: "24.25.N.018", name: "Leander Filbert Wibowo", sex: "M" },
      { sid: "25.26.K1.005", name: "Lucio Moses Alexander", sex: "M" },
      { sid: "24.25.N.015b", name: "Mikhael Brian Lee", sex: "M" },
      { sid: "24.25.N.008", name: "Nelson Immanuel Iskandar", sex: "M" },
      { sid: "26.27.K2.001", name: "Sirena Yuri Ghosako", sex: "F" },
      { sid: "24.25.N.020", name: "Valerie Joan Christiono", sex: "F" },
    ],
  },
];

export interface SeedResult {
  classesAdded: number;
  studentsAdded: number;
  teachersAdded: number;
  totalStudents: number;
}

export async function seedStellaMaris(): Promise<SeedResult> {
  const db = getSchoolDb();
  const now = Date.now();
  let classesAdded = 0;
  let studentsAdded = 0;
  let teachersAdded = 0;
  let totalStudents = 0;

  for (const c of CLASSES) {
    let existing = await db.classes.where("name").equals(c.name).first();
    let classId = existing?.id;
    if (!classId) {
      classId = await db.classes.add({
        name: c.name, division: "kindergarten", level: c.level, createdAt: now,
      });
      classesAdded++;
    }

    for (const tname of c.teachers) {
      const exists = await db.staff.where("fullName").equals(tname).first();
      if (!exists) {
        await db.staff.add({
          fullName: tname, role: "teacher_homeroom", division: "kindergarten",
          classId, createdAt: now,
        });
        teachersAdded++;
      }
    }

    for (const s of c.students) {
      totalStudents++;
      const dupe = await db.students
        .where("classId").equals(classId!)
        .filter(x => x.fullName === s.name || x.nickname === s.sid)
        .first();
      if (dupe) continue;
      await db.students.add({
        fullName: s.name,
        nickname: s.sid, // student number ID stored in nickname field
        gender: s.sex,
        classId,
        createdAt: now,
      });
      studentsAdded++;
    }
  }

  return { classesAdded, studentsAdded, teachersAdded, totalStudents };
}
