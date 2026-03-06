/**
 * Auto-corrects common spelling mistakes in job titles, locations, and company names.
 * Applied at display time so original DB data is preserved.
 */

const titleCorrections: Record<string, string> = {
  // Principal variations
  'princepal': 'Principal',
  'princpal': 'Principal',
  'principel': 'Principal',
  'princiapl': 'Principal',
  'pricipal': 'Principal',
  'prinicpal': 'Principal',
  // Teacher variations
  'techer': 'Teacher',
  'taecher': 'Teacher',
  'tecaher': 'Teacher',
  'teachar': 'Teacher',
  // Engineer variations
  'enginer': 'Engineer',
  'enginear': 'Engineer',
  'engneer': 'Engineer',
  'engineeer': 'Engineer',
  'enginner': 'Engineer',
  // Developer variations
  'devloper': 'Developer',
  'develper': 'Developer',
  'developar': 'Developer',
  'develeoper': 'Developer',
  'devoloper': 'Developer',
  // Manager variations
  'mangaer': 'Manager',
  'managar': 'Manager',
  'managr': 'Manager',
  'manger': 'Manager',
  // Accountant variations
  'accountent': 'Accountant',
  'accoutant': 'Accountant',
  'acountant': 'Accountant',
  // Consultant variations
  'consultent': 'Consultant',
  'consulatant': 'Consultant',
  // Director variations
  'directer': 'Director',
  'directar': 'Director',
  // Coordinator variations
  'cordinator': 'Coordinator',
  'coordinater': 'Coordinator',
  'co-ordinator': 'Coordinator',
  // Analyst variations
  'analist': 'Analyst',
  'analust': 'Analyst',
  // Professor variations
  'professer': 'Professor',
  'proffesor': 'Professor',
  'proffessor': 'Professor',
  // Lecturer
  'lecturar': 'Lecturer',
  'lectrer': 'Lecturer',
  // Assistant
  'assitant': 'Assistant',
  'asistant': 'Assistant',
  'assistent': 'Assistant',
  // Receptionist
  'receptonist': 'Receptionist',
  'receptionst': 'Receptionist',
  // Administrator
  'administator': 'Administrator',
  'adminstrator': 'Administrator',
  // Supervisor
  'superviser': 'Supervisor',
  'supevisor': 'Supervisor',
  // Executive
  'excutive': 'Executive',
  'executve': 'Executive',
  // Architect
  'architecht': 'Architect',
  'architecte': 'Architect',
  // Designer
  'desinger': 'Designer',
  'designar': 'Designer',
  // Specialist
  'specalist': 'Specialist',
  'specialst': 'Specialist',
};

const locationCorrections: Record<string, string> = {
  // Bangalore variations
  'banglore': 'Bangalore',
  'bangalor': 'Bangalore',
  'banglaore': 'Bangalore',
  'banglor': 'Bangalore',
  'bangalroe': 'Bangalore',
  'banagalore': 'Bangalore',
  'bangaloree': 'Bangalore',
  // Hyderabad variations
  'hydrabad': 'Hyderabad',
  'hyderabd': 'Hyderabad',
  'hyderbad': 'Hyderabad',
  'hydarabad': 'Hyderabad',
  'hiderabad': 'Hyderabad',
  // Chennai variations
  'chenai': 'Chennai',
  'chennai': 'Chennai',
  'chennnai': 'Chennai',
  // Mumbai variations
  'mumabi': 'Mumbai',
  'mubai': 'Mumbai',
  'mumbai': 'Mumbai',
  // Delhi variations
  'dlehi': 'Delhi',
  'dehli': 'Delhi',
  'delih': 'Delhi',
  // Kolkata variations
  'kolkatta': 'Kolkata',
  'calcutta': 'Kolkata',
  'kolkota': 'Kolkata',
  // Pune variations
  'puna': 'Pune',
  'poone': 'Pune',
  // Gurgaon/Gurugram variations
  'gurgoan': 'Gurugram',
  'gurgaun': 'Gurugram',
  // Noida variations
  'nodia': 'Noida',
  // Ahmedabad variations
  'ahemdabad': 'Ahmedabad',
  'ahmadabad': 'Ahmedabad',
  'ahmedabd': 'Ahmedabad',
  // Jaipur variations
  'jaipar': 'Jaipur',
  'jaipor': 'Jaipur',
  // Lucknow variations
  'luknow': 'Lucknow',
  'lacknow': 'Lucknow',
  // Chandigarh variations
  'chandighar': 'Chandigarh',
  'chandigrah': 'Chandigarh',
  // Coimbatore variations
  'coimbatoor': 'Coimbatore',
  'coimbtore': 'Coimbatore',
  // Visakhapatnam variations
  'vishakapatnam': 'Visakhapatnam',
  'vizag': 'Visakhapatnam',
  // Thiruvananthapuram variations
  'trivandrum': 'Thiruvananthapuram',
  // Bhubaneswar variations  
  'bhubneswar': 'Bhubaneswar',
  'bhubaneshwar': 'Bhubaneswar',
};

function correctWords(text: string, dictionary: Record<string, string>): string {
  if (!text) return text;
  
  // Split into words, correct each, and rejoin preserving separators
  return text.replace(/[a-zA-Z]+/g, (word) => {
    const lower = word.toLowerCase();
    const correction = dictionary[lower];
    if (correction) {
      return correction;
    }
    return word;
  });
}

/** Auto-correct common typos in a job title */
export function correctJobTitle(title: string): string {
  return correctWords(title, titleCorrections);
}

/** Auto-correct common typos in a location string */
export function correctLocation(location: string): string {
  return correctWords(location, locationCorrections);
}

/** Auto-correct both title and location on a job-like object */
export function correctJobDisplayData<T extends { title?: string; location?: string }>(job: T): T {
  return {
    ...job,
    ...(job.title && { title: correctJobTitle(job.title) }),
    ...(job.location && { location: correctLocation(job.location) }),
  };
}
