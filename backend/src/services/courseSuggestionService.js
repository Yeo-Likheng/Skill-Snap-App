// services/courseSuggestionService.js
import Course from "../models/course.model.js";

/**
 * Main function to suggest courses for missing skills
 * @param {Array} missingSkills - Array of skill strings that the candidate lacks
 * @returns {Object} Course suggestions organized by skill
 */
export async function suggestCoursesFromSkills(missingSkills) {
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
    
    // Process each missing skill
    for (const missingSkill of missingSkills) {
      const skillMatches = await findCoursesForSkill(missingSkill, allCourses);
      
      if (skillMatches.length > 0) {
        courseSuggestions[missingSkill] = skillMatches;
        totalCourses += skillMatches.length;
      }
    }
    
    return {
      suggestions: courseSuggestions,
      totalCourses,
      skillsWithCourses: Object.keys(courseSuggestions).length,
      skillsWithoutCourses: missingSkills.length - Object.keys(courseSuggestions).length,
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

/**
 * Find courses for a specific skill using strict matching
 * @param {String} skill - The skill to find courses for
 * @param {Array} allCourses - All available courses from database
 * @returns {Array} Array of matching courses
 */
async function findCoursesForSkill(skill, allCourses) {
  const skillLower = skill.toLowerCase().trim();
  
  // Primary Strategy: Exact skill field matching only
  const exactMatches = allCourses.filter(course => {
    if (!course.skill) return false;
    const courseSkillLower = course.skill.toLowerCase().trim();
    
    // Only exact match or if the skill is contained in course skill
    return courseSkillLower === skillLower || 
           courseSkillLower.includes(skillLower);
  });
  
  // Secondary Strategy: Check skill variations (only for skill field)
  const variationMatches = allCourses.filter(course => {
    if (!course.skill) return false;
    const courseSkillLower = course.skill.toLowerCase().trim();
    
    // Check if any variation of the missing skill matches the course skill
    return getSkillVariations(skill).some(variation => {
      const variationLower = variation.toLowerCase().trim();
      return courseSkillLower === variationLower || 
             courseSkillLower.includes(variationLower);
    });
  });
  
  // Only use title matching if no skill field matches are found
  let titleMatches = [];
  if (exactMatches.length === 0 && variationMatches.length === 0) {
    titleMatches = allCourses.filter(course => {
      if (!course.title) return false;
      const titleLower = course.title.toLowerCase();
      
      // Very strict title matching - only if skill is prominently mentioned
      return titleLower.includes(skillLower) && titleLower.split(' ').includes(skillLower);
    });
  }
  
  // Combine matches and remove duplicates based on _id
  const allMatches = [...exactMatches, ...variationMatches, ...titleMatches];
  const uniqueMatches = allMatches.filter((course, index, self) => 
    index === self.findIndex(c => c._id.toString() === course._id.toString())
  );
  
  // Score and sort matches by relevance
  const scoredMatches = uniqueMatches.map(course => ({
    ...course,
    relevanceScore: calculateRelevanceScore(course, skill),
    relevanceReason: determineRelevanceReason(course, skill)
  }));
  
  // Sort by relevance score (highest first)
  const sortedMatches = scoredMatches
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(course => ({
      id: course._id,
      title: course.title,
      skill: course.skill,
      platform: course.platform,
      url: course.url,
      image: course.image,
      relevanceScore: course.relevanceScore,
      relevanceReason: course.relevanceReason
    }));
  
  console.log(`Found ${sortedMatches.length} courses for skill: ${skill}`);
  return sortedMatches;
}

/**
 * Calculate relevance score for a course-skill match - stricter scoring
 * @param {Object} course - Course object
 * @param {String} skill - Target skill
 * @returns {Number} Relevance score (0-100)
 */
function calculateRelevanceScore(course, skill) {
  const skillLower = skill.toLowerCase().trim();
  const courseSkillLower = (course.skill || '').toLowerCase().trim();
  const courseTitleLower = (course.title || '').toLowerCase().trim();
  
  let score = 0;
  
  // Exact skill match (highest priority)
  if (courseSkillLower === skillLower) {
    score = 100;
  }
  // Course skill contains the missing skill
  else if (courseSkillLower.includes(skillLower)) {
    score = 95;
  }
  // Exact variation match in skill field
  else if (getSkillVariations(skill).some(variation => {
    const variationLower = variation.toLowerCase();
    return courseSkillLower === variationLower;
  })) {
    score = 90;
  }
  // Variation contained in skill field
  else if (getSkillVariations(skill).some(variation => {
    const variationLower = variation.toLowerCase();
    return courseSkillLower.includes(variationLower);
  })) {
    score = 85;
  }
  // Title contains exact skill (only if no skill field match)
  else if (courseTitleLower.includes(skillLower) && courseTitleLower.split(' ').includes(skillLower)) {
    score = 70;
  }
  // Lower score for other matches
  else {
    score = 30;
  }
  
  // Boost score for popular platforms
  const popularPlatforms = ['coursera', 'udemy', 'edx', 'pluralsight', 'linkedin learning'];
  if (course.platform && popularPlatforms.some(platform => 
    course.platform.toLowerCase().includes(platform))) {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Determine why a course is relevant to a skill - stricter reasoning
 * @param {Object} course - Course object
 * @param {String} skill - Target skill
 * @returns {String} Reason for relevance
 */
function determineRelevanceReason(course, skill) {
  const skillLower = skill.toLowerCase().trim();
  const courseSkillLower = (course.skill || '').toLowerCase().trim();
  const courseTitleLower = (course.title || '').toLowerCase().trim();
  
  if (courseSkillLower === skillLower) {
    return 'Exact skill match';
  } else if (courseSkillLower.includes(skillLower)) {
    return 'Direct skill match';
  } else if (getSkillVariations(skill).some(variation => {
    const variationLower = variation.toLowerCase();
    return courseSkillLower === variationLower;
  })) {
    return 'Exact skill variation match';
  } else if (getSkillVariations(skill).some(variation => {
    const variationLower = variation.toLowerCase();
    return courseSkillLower.includes(variationLower);
  })) {
    return 'Skill variation match';
  } else if (courseTitleLower.includes(skillLower) && courseTitleLower.split(' ').includes(skillLower)) {
    return 'Skill mentioned in course title';
  } else {
    return 'Partial content match';
  }
}

/**
 * Get variations and abbreviations for skills
 * @param {String} skill - Original skill name
 * @returns {Array} Array of skill variations
 */
function getSkillVariations(skill) {
  const variations = {
    'JavaScript': ['js', 'javascript', 'ecmascript', 'es6', 'es2015'],
    'TypeScript': ['ts', 'typescript'],
    'Node.js': ['nodejs', 'node', 'node js'],
    'React': ['reactjs', 'react.js', 'react js'],
    'Vue.js': ['vue', 'vuejs', 'vue js'],
    'Vue': ['vue.js', 'vuejs', 'vue js'],
    'Angular': ['angularjs', 'angular.js', 'angular js'],
    'MongoDB': ['mongo', 'mongo db'],
    'PostgreSQL': ['postgres', 'postgresql', 'postgres sql'],
    'MySQL': ['mysql', 'my sql'],
    'AWS': ['amazon web services', 'aws cloud'],
    'Azure': ['microsoft azure', 'azure cloud'],
    'GCP': ['google cloud platform', 'google cloud'],
    'Machine Learning': ['ml', 'machine-learning'],
    'Artificial Intelligence': ['ai', 'artificial-intelligence'],
    'Deep Learning': ['dl', 'deep-learning'],
    'Data Science': ['data-science', 'datascience'],
    'User Interface': ['ui', 'user-interface'],
    'User Experience': ['ux', 'user-experience'],
    'API': ['application programming interface', 'rest api', 'api development'],
    'CI/CD': ['continuous integration', 'continuous deployment', 'ci cd'],
    'SEO': ['search engine optimization', 'seo optimization'],
    'C++': ['cpp', 'c plus plus', 'cplusplus'],
    'C#': ['csharp', 'c sharp', 'c-sharp'],
    'SQL': ['structured query language', 'sql database'],
    'NoSQL': ['nosql', 'no sql', 'no-sql'],
    'REST': ['rest api', 'restful', 'rest services'],
    'GraphQL': ['graphql', 'graph ql'],
    'Docker': ['containerization', 'containers'],
    'Kubernetes': ['k8s', 'container orchestration'],
    'Git': ['version control', 'git version control'],
    'HTML': ['html5', 'hypertext markup language'],
    'CSS': ['css3', 'cascading style sheets'],
    'Python': ['python programming', 'python development'],
    'Java': ['java programming', 'java development'],
    'Spring Boot': ['springboot', 'spring framework'],
    'Express.js': ['express', 'expressjs'],
    'Redux': ['redux js', 'state management'],
    'Webpack': ['module bundler', 'build tool'],
    'Jest': ['javascript testing', 'unit testing'],
    'Selenium': ['web automation', 'browser automation']
  };
  
  return variations[skill] || [skill.toLowerCase()];
}

/**
 * Get related skills that might be taught together
 * @param {String} skill - Original skill name
 * @returns {Array} Array of related skills
 */
function getRelatedSkills(skill) {
  const relatedSkillsMap = {
    'React': ['Redux', 'JSX', 'Next.js', 'React Router', 'Material-UI'],
    'Angular': ['TypeScript', 'RxJS', 'Angular CLI', 'NgRx'],
    'Vue.js': ['Vuex', 'Vue Router', 'Nuxt.js'],
    'Vue': ['Vuex', 'Vue Router', 'Nuxt.js'],
    'Node.js': ['Express.js', 'npm', 'MongoDB', 'Socket.io'],
    'Python': ['Django', 'Flask', 'NumPy', 'Pandas', 'pip'],
    'JavaScript': ['HTML', 'CSS', 'DOM', 'jQuery', 'AJAX'],
    'Machine Learning': ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn'],
    'Data Science': ['Python', 'R', 'Jupyter', 'Pandas', 'NumPy'],
    'AWS': ['EC2', 'S3', 'Lambda', 'CloudFormation', 'IAM'],
    'Docker': ['Kubernetes', 'DevOps', 'CI/CD', 'containerization'],
    'Kubernetes': ['Docker', 'DevOps', 'Helm', 'microservices'],
    'MongoDB': ['NoSQL', 'Mongoose', 'database design'],
    'PostgreSQL': ['SQL', 'database design', 'relational databases'],
    'MySQL': ['SQL', 'database design', 'relational databases'],
    'Git': ['GitHub', 'GitLab', 'version control', 'collaboration'],
    'HTML': ['CSS', 'JavaScript', 'web development'],
    'CSS': ['HTML', 'SASS', 'LESS', 'responsive design'],
    'REST API': ['HTTP', 'JSON', 'API design', 'web services'],
    'GraphQL': ['Apollo', 'API design', 'query language'],
    'Spring Boot': ['Java', 'Spring Framework', 'Maven', 'Gradle'],
    'Django': ['Python', 'web development', 'ORM', 'MVT'],
    'Flask': ['Python', 'web development', 'Jinja2'],
    'Express.js': ['Node.js', 'middleware', 'routing'],
    'Redux': ['React', 'state management', 'JavaScript'],
    'TensorFlow': ['Machine Learning', 'Python', 'Deep Learning'],
    'PyTorch': ['Machine Learning', 'Python', 'Deep Learning'],
    'Jenkins': ['CI/CD', 'DevOps', 'automation', 'deployment'],
    'Selenium': ['test automation', 'web testing', 'QA'],
    'Jest': ['JavaScript testing', 'React testing', 'unit tests']
  };
  
  return relatedSkillsMap[skill] || [];
}

/**
 * Alternative function for backward compatibility
 * Maps to the main function with same signature as in nerService.js
 */
export async function suggestCoursesForMissingSkills(missingSkills) {
  return await suggestCoursesFromSkills(missingSkills);
}

/**
 * Get course suggestions with enhanced filtering options
 * @param {Array} missingSkills - Missing skills array
 * @param {Object} options - Filtering options
 * @returns {Object} Enhanced course suggestions
 */
export async function getEnhancedCourseSuggestions(missingSkills, options = {}) {
  const {
    maxCoursesPerSkill = 3,
    minRelevanceScore = 50,
    preferredPlatforms = [],
    excludePlatforms = []
  } = options;
  
  try {
    const baseSuggestions = await suggestCoursesFromSkills(missingSkills);
    
    if (!baseSuggestions.suggestions) {
      return baseSuggestions;
    }
    
    // Apply enhanced filtering
    const filteredSuggestions = {};
    
    for (const [skill, courses] of Object.entries(baseSuggestions.suggestions)) {
      let filteredCourses = courses;
      
      // Filter by minimum relevance score
      filteredCourses = filteredCourses.filter(course => 
        course.relevanceScore >= minRelevanceScore
      );
      
      // Filter by preferred platforms
      if (preferredPlatforms.length > 0) {
        const preferredCourses = filteredCourses.filter(course =>
          preferredPlatforms.some(platform => 
            course.platform.toLowerCase().includes(platform.toLowerCase())
          )
        );
        if (preferredCourses.length > 0) {
          filteredCourses = preferredCourses;
        }
      }
      
      // Exclude specific platforms
      if (excludePlatforms.length > 0) {
        filteredCourses = filteredCourses.filter(course =>
          !excludePlatforms.some(platform =>
            course.platform.toLowerCase().includes(platform.toLowerCase())
          )
        );
      }
      
      // Limit courses per skill
      filteredCourses = filteredCourses.slice(0, maxCoursesPerSkill);
      
      if (filteredCourses.length > 0) {
        filteredSuggestions[skill] = filteredCourses;
      }
    }
    
    return {
      ...baseSuggestions,
      suggestions: filteredSuggestions,
      totalCourses: Object.values(filteredSuggestions).flat().length,
      skillsWithCourses: Object.keys(filteredSuggestions).length,
      appliedFilters: {
        maxCoursesPerSkill,
        minRelevanceScore,
        preferredPlatforms,
        excludePlatforms
      }
    };
    
  } catch (error) {
    console.error("Enhanced course suggestion error:", error);
    throw error;
  }
}
