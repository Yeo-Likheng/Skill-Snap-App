import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export async function extractResumeData(filePath, originalFileName = '') {
  try {
    console.log("File path received:", filePath);
    console.log("Original filename:", originalFileName);

    let fileExtension = originalFileName
      ? path.extname(originalFileName).toLowerCase()
      : path.extname(filePath).toLowerCase();

    if (!fileExtension) {
      fileExtension = await detectFileType(filePath);
      console.log("Detected file type from content:", fileExtension);
    }

    let extractedText = "";

    if (fileExtension === '.pdf') {
      extractedText = await extractFromPDF(filePath);
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(fileExtension)) {
      extractedText = await extractFromImage(filePath);
    } else if (['.doc', '.docx'].includes(fileExtension)) {
      extractedText = await extractFromWord(filePath);
    } else {
      try {
        extractedText = await extractFromImage(filePath);
      } catch {
        extractedText = await extractFromPDF(filePath);
      }
    }

    console.log("Text extracted, length:", extractedText.length);

    return structureResumeDataLocal(extractedText);

  } catch (error) {
    console.error("Resume extraction error:", error);
    throw error;
  }
}

async function detectFileType(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.slice(0, 4).toString('hex') === '25504446') return '.pdf';
    if (buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return '.png';
    if (buffer.slice(0, 3).toString('hex') === 'ffd8ff') return '.jpg';
    if (buffer.slice(0, 4).toString('hex') === '52494646' && buffer.slice(8, 12).toString('hex') === '57454250') return '.webp';
    if (buffer.slice(0, 8).toString('hex') === 'd0cf11e0a1b11ae1' ||
        buffer.slice(0, 4).toString('hex') === '504b0304') return '.docx';
    return '';
  } catch {
    return '';
  }
}

async function extractFromPDF(filePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  if (!data.text || data.text.trim().length < 20) {
    throw new Error("PDF appears empty or is image-based");
  }
  return data.text;
}

async function extractFromImage(filePath) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.reinitialize('eng');
  const { data: { text } } = await worker.recognize(filePath);
  await worker.terminate();
  if (!text || text.trim().length < 20) {
    throw new Error("Image OCR failed or text too short");
  }
  return text;
}

async function extractFromWord(filePath) {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function structureResumeDataLocal(rawText) {
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("Extracted text too short or empty");
  }

  return {
    success: true,
    data: {
      personalInfo: extractPersonalInfo(rawText),
      workExperience: [], // Could be filled with regex parsing if needed
      education: [],
      skills: extractSkillsFromText(rawText)
    },
    rawText: rawText
  };
}

function extractSkillsFromText(text) {
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin',
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'HTML', 'CSS', 'SASS', 'TypeScript',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL', 'Springboot',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub',
    'Machine Learning', 'Data Science', 'AI', 'REST API', 'GraphQL', 'Linux',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication', 
    'Deep Learning', 'Data Science', 'Data Analysis', 'Statistics', 'Django', 'Flask',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Matplotlib', 'Seaborn',
    'Jest', 'Mocha', 'Cypress', 'Selenium', 'JUnit', 'PyTest', 'Postman', 'Unit Testing',
  ];
  
  const foundSkills = [];
  const lowerText = text.toLowerCase();
  
  commonSkills.forEach(skill => {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });
  
  return [...new Set(foundSkills)];
}

function extractPersonalInfo(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /[\+]?[1-9]?[\-\s]?[\(]?[0-9]{3}[\)]?[\-\s]?[0-9]{3}[\-\s]?[0-9]{4,6}/;
  
  const email = text.match(emailRegex)?.[0] || "";
  const phone = text.match(phoneRegex)?.[0] || "";
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const name = lines.find(line => 
    line.length > 3 && 
    line.length < 50 && 
    !line.includes('@') && 
    !line.match(/^\d/)
  ) || "";
  
  return { name, email, phone };
}
