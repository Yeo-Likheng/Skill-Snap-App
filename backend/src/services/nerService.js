import Course from "../models/course.model.js";

// Rule-based skill extraction with comprehensive skill database
export function extractSkills(text) {
  console.log("Using rule-based skill extraction");
  
  const skillDatabase = {
    // Programming Languages
    programmingLanguages: [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
      'Kotlin', 'TypeScript', 'Scala', 'R', 'MATLAB', 'Perl', 'Haskell', 'Dart', 'Lua', 'C'
    ],
    
    // Web Technologies
    webTechnologies: [
      'React', 'Vue', 'Angular', 'Node.js', 'Express.js', 'Express', 'HTML', 'CSS', 'SASS', 'LESS',
      'Bootstrap', 'jQuery', 'Redux', 'Next.js', 'Nuxt.js', 'Webpack', 'Vite', 'Babel',
      'React Native', 'Flutter', 'Django', 'Flask', 'Spring Boot', 'Laravel'
    ],
    
    // Databases
    databases: [
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server', 
      'DynamoDB', 'Cassandra', 'Neo4j', 'InfluxDB', 'CouchDB', 'SQL', 'NoSQL'
    ],
    
    // Cloud & DevOps
    cloudDevOps: [
      'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 
      'GitHub', 'GitLab', 'CI/CD', 'Terraform', 'Ansible', 'Chef', 'Puppet', 'Vagrant',
      'CircleCI', 'Travis CI', 'GitOps'
    ],
    
    // Data Science & ML
    dataScienceML: [
      'Machine Learning', 'Deep Learning', 'Data Science', 'Data Analysis', 'Statistics',
      'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Matplotlib', 'Seaborn',
      'Jupyter', 'Power BI', 'Tableau', 'Apache Spark', 'Hadoop', 'Kafka', 'Airflow'
    ],
    
    // Mobile Development
    mobile: [
      'iOS', 'Android', 'React Native', 'Flutter', 'Xamarin', 'Ionic', 'Swift', 'Kotlin',
      'Objective-C', 'Java Android', 'Cordova', 'PhoneGap'
    ],
    
    // Testing & Quality
    testing: [
      'Jest', 'Mocha', 'Cypress', 'Selenium', 'JUnit', 'PyTest', 'Postman', 'Unit Testing',
      'Integration Testing', 'Test Automation', 'TDD', 'BDD'
    ],
    
    // Soft Skills
    softSkills: [
      'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication', 'Teamwork',
      'Problem Solving', 'Critical Thinking', 'Time Management', 'Adaptability', 'Kanban'
    ],
    
    // Other Technologies
    other: [
      'REST API', 'GraphQL', 'Microservices', 'Blockchain', 'IoT', 'AR/VR', 'Game Development',
      'Cybersecurity', 'Network Security', 'Penetration Testing', 'Ethical Hacking',
      'Linux', 'Windows', 'macOS', 'Unix', 'Bash', 'PowerShell'
    ]
  };
  
  const allSkills = Object.values(skillDatabase).flat();
  const foundSkills = [];

  
  // Check for exact matches and variations
  allSkills.forEach(skill => {
    const lowerSkill = skill.toLowerCase();
    
    // Direct match with word boundaries
    const regex = new RegExp(`\\b${lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.push(skill);
      return;
    }
    
    // Check for variations and abbreviations
    const variations = getSkillVariations(skill);
    for (const variation of variations) {
      const variationRegex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (variationRegex.test(text)) {
        foundSkills.push(skill);
        break;
      }
    }
  });
  
  // Extract skills from common patterns
  const skillPatterns = [
    /(?:technologies|skills|tools|languages|frameworks|key skills)[:]\s*([^.\n]{10,200})/gi,
    /(?:experience\s+(?:with|in)|proficient\s+(?:with|in)|knowledge\s+of|familiar\s+with)\s+([^.,\n]{5,50})/gi,
    /(?:\d+\+?\s*years?\s+(?:of\s+)?(?:experience\s+)?(?:with|in)\s+)([^.,\n]{5,50})/gi
  ];
  
  skillPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const extractedText = match[1].trim();
      const skillsInText = extractedText.split(/[,;&|\/]/).map(s => s.trim());
      
      skillsInText.forEach(skill => {
        if (skill.length > 2 && skill.length < 50) {
          // Check if it matches any known skill
          const matchedSkill = allSkills.find(knownSkill => 
            knownSkill.toLowerCase() === skill.toLowerCase() ||
            getSkillVariations(knownSkill).some(variation => 
              variation.toLowerCase() === skill.toLowerCase()
            )
          );
          
          if (matchedSkill) {
            foundSkills.push(matchedSkill);
          }
        }
      });
    });
  });
  
  const uniqueSkills = [...new Set(foundSkills)];
  console.log(`Rule-based extraction found ${uniqueSkills.length} skills:`, uniqueSkills);
  
  return uniqueSkills;
}

// Get variations and abbreviations for skills
function getSkillVariations(skill) {
  const variations = {
    'JavaScript': ['js', 'javascript', 'ecmascript'],
    'TypeScript': ['ts', 'typescript'],
    'Node.js': ['nodejs', 'node', 'node js'],
    'React': ['reactjs', 'react.js'],
    'Vue.js': ['vue', 'vuejs', 'vue js'],
    'Angular': ['angularjs', 'angular.js'],
    'MongoDB': ['mongo'],
    'PostgreSQL': ['postgres', 'postgresql'],
    'MySQL': ['mysql'],
    'Amazon Web Services': ['aws'],
    'Google Cloud Platform': ['gcp'],
    'Machine Learning': ['ml'],
    'Artificial Intelligence': ['ai'],
    'User Interface': ['ui'],
    'User Experience': ['ux'],
    'Application Programming Interface': ['api'],
    'Continuous Integration': ['ci'],
    'Continuous Deployment': ['cd'],
    'Search Engine Optimization': ['seo'],
    'C++': ['cpp', 'c plus plus'],
    'C#': ['csharp', 'c sharp']
  };
  
  return variations[skill] || [];
}

// Enhanced skill matching with similarity scoring
export async function matchSkillsEnhanced(candidateSkills, jobSkills) {
  if (!candidateSkills.length || !jobSkills.length) {
    return [];
  }

  console.log(`Matching ${candidateSkills.length} candidate skills with ${jobSkills.length} job skills`);
  
  const matches = [];
  
  for (const candidateSkill of candidateSkills) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const jobSkill of jobSkills) {
      // Calculate similarity score
      const score = calculateSkillSimilarity(candidateSkill, jobSkill);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = jobSkill;
      }
    }
    
    if (bestMatch && bestScore > 0.3) { // Lower threshold for better matching
      matches.push({
        candidateSkill,
        jobSkill: bestMatch,
        score: bestScore,
        matchType: bestScore > 0.8 ? 'exact' : bestScore > 0.6 ? 'similar' : 'partial'
      });
    }
  }
  
  console.log(`Found ${matches.length} skill matches`);
  return matches;
}

// Calculate similarity between two skills
function calculateSkillSimilarity(skill1, skill2) {
  const s1 = skill1.toLowerCase().trim();
  const s2 = skill2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Check variations
  const variations1 = getSkillVariations(skill1);
  const variations2 = getSkillVariations(skill2);
  
  if (variations1.some(v => v.toLowerCase() === s2) || 
      variations2.some(v => v.toLowerCase() === s1)) {
    return 0.85;
  }
  
  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity > 0.7 ? similarity : 0;
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Enhanced course suggestion with MongoDB integration
export async function suggestCoursesForMissingSkills(missingSkills) {
  if (!Array.isArray(missingSkills) || missingSkills.length === 0) {
    return {
      suggestions: {},
      totalCourses: 0,
      message: "No missing skills identified"
    };
  }

  console.log("Finding courses for missing skills:", missingSkills);
  
  try {
    const courseSuggestions = {};
    let totalCourses = 0;
    
    // Get all courses from MongoDB
    const allCourses = await Course.find({}).lean();
    console.log(`Found ${allCourses.length} courses in database`);
    
    if (allCourses.length === 0) {
      return {
        suggestions: {},
        totalCourses: 0,
        message: "No courses available in database. Please add some courses first."
      };
    }
    
    for (const missingSkill of missingSkills) {
      const skillLower = missingSkill.toLowerCase();
      
      // Method 1: Direct skill field match
      const directMatches = allCourses.filter(course => {
        if (!course.skill) return false;
        return course.skill.toLowerCase().includes(skillLower) || 
               skillLower.includes(course.skill.toLowerCase());
      });
      
      // Method 2: Search in course title and description
      const contentMatches = allCourses.filter(course => {
        const title = (course.title || '').toLowerCase();
        const description = (course.description || '').toLowerCase();
        
        return title.includes(skillLower) || 
               description.includes(skillLower) ||
               getSkillVariations(missingSkill).some(variation => 
                 title.includes(variation.toLowerCase()) || 
                 description.includes(variation.toLowerCase())
               );
      });
      
      // Method 3: Category-based matching
      const categoryMatches = allCourses.filter(course => {
        if (!course.category) return false;
        const category = course.category.toLowerCase();
        
        // Map skills to categories
        const skillCategoryMap = {
          'javascript': ['web development', 'programming', 'frontend'],
          'python': ['programming', 'data science', 'backend'],
          'react': ['web development', 'frontend', 'javascript'],
          'node.js': ['web development', 'backend', 'javascript'],
          'machine learning': ['data science', 'ai', 'analytics'],
          'docker': ['devops', 'cloud', 'deployment'],
          'aws': ['cloud', 'devops', 'infrastructure'],
          'sql': ['database', 'data', 'backend'],
          'git': ['version control', 'development', 'collaboration']
        };
        
        const possibleCategories = skillCategoryMap[skillLower] || [];
        return possibleCategories.some(cat => category.includes(cat));
      });
      
      // Combine all matches and remove duplicates
      const allMatches = [...directMatches, ...contentMatches, ...categoryMatches];
      const uniqueMatches = allMatches.filter((course, index, self) => 
        index === self.findIndex(c => c._id.toString() === course._id.toString())
      );
      
      // Sort by relevance (prioritize direct matches)
      const sortedMatches = uniqueMatches
        .sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          
          // Prioritize courses with skill in title
          const aHasSkillInTitle = aTitle.includes(skillLower);
          const bHasSkillInTitle = bTitle.includes(skillLower);
          
          if (aHasSkillInTitle && !bHasSkillInTitle) return -1;
          if (!aHasSkillInTitle && bHasSkillInTitle) return 1;
          
          return 0;
        })
        .slice(0, 3); // Limit to top 3 courses per skill
      
      if (sortedMatches.length > 0) {
        courseSuggestions[missingSkill] = sortedMatches.map(course => ({
          id: course._id,
          title: course.title,
          description: course.description,
          skill: course.skill,
          category: course.category,
          duration: course.duration,
          level: course.level,
          provider: course.provider,
          url: course.url,
          rating: course.rating,
          relevanceReason: determineRelevanceReason(course, missingSkill)
        }));
        
        totalCourses += sortedMatches.length;
      }
    }
    
    return {
      suggestions: courseSuggestions,
      totalCourses,
      skillsWithCourses: Object.keys(courseSuggestions).length,
      message: `Found courses for ${Object.keys(courseSuggestions).length} out of ${missingSkills.length} missing skills`
    };
    
  } catch (error) {
    console.error("Course suggestion error:", error);
    return {
      suggestions: {},
      totalCourses: 0,
      error: error.message,
      message: "Failed to retrieve course suggestions"
    };
  }
}

// Determine why a course is relevant to a skill
function determineRelevanceReason(course, skill) {
  const skillLower = skill.toLowerCase();
  const title = (course.title || '').toLowerCase();
  const description = (course.description || '').toLowerCase();
  const courseSkill = (course.skill || '').toLowerCase();
  
  if (courseSkill.includes(skillLower) || skillLower.includes(courseSkill)) {
    return 'Direct skill match';
  } else if (title.includes(skillLower)) {
    return 'Skill mentioned in course title';
  } else if (description.includes(skillLower)) {
    return 'Skill covered in course content';
  } else {
    return 'Related technology or category match';
  }
}