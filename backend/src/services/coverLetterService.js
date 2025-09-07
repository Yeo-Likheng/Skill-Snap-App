import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { extractResumeData } from "./documentQAService.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Function to parse candidate information from extracted text using AI
async function parseCandidateInfo(extractedText, existingData = null) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY in environment variables");
  }

  // If we have structured data from your extractor, use it as a starting point
  let baseInfo = {
    name: "N/A",
    skills: [],
    experience: "N/A",
    education: "N/A"
  };

  if (existingData && existingData.data) {
    baseInfo = {
      name: existingData.data.personalInfo?.name || "N/A",
      skills: existingData.data.skills || [],
      experience: "N/A", // Will be enhanced by AI
      education: "N/A"    // Will be enhanced by AI
    };
  }

  const parsePrompt = `
  Extract and enhance the following information from this resume/CV text and return it in JSON format:

  Text to analyze:
  ${extractedText}

  Current extracted data (enhance this):
  - Name: ${baseInfo.name}
  - Skills: ${baseInfo.skills.join(", ")}

  Please extract and provide:
  - name: (full name of the candidate - use existing if good, otherwise extract better)
  - skills: (comprehensive array of technical and soft skills - enhance the existing list)
  - experience: (detailed work experience summary, including job titles, companies, and key achievements)
  - education: (educational background including degrees, institutions, graduation years)

  Return ONLY valid JSON in this exact format:
  {
    "name": "candidate name",
    "skills": ["skill1", "skill2", "skill3"],
    "experience": "comprehensive work experience summary with job titles and companies",
    "education": "educational background with degrees and institutions"
  }

  If any information is not found, use "N/A" as the value.
  Do not include any explanatory text, only the JSON object.
  `;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5006",
      "X-Title": "SkillSnap Resume App"
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        {
          role: "user",
          content: parsePrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    // Clean the response and extract JSON
    const cleanContent = content.trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Merge with existing data to ensure we don't lose anything
      return {
        name: parsedData.name !== "N/A" ? parsedData.name : baseInfo.name,
        skills: [...new Set([...baseInfo.skills, ...(parsedData.skills || [])])],
        experience: parsedData.experience || baseInfo.experience,
        education: parsedData.education || baseInfo.education
      };
    } else {
      throw new Error("No valid JSON found in response");
    }
  } catch (error) {
    console.error("Error parsing candidate info:", error);
    console.error("Raw response:", content);
    
    // Return enhanced base info if parsing fails
    return baseInfo;
  }
}

// Main function - now uses your existing extractor
export async function generateCoverLetter(resumeFile, jobDescription, originalFileName = '') {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY in environment variables");
  }

  try {
    // Check if file exists
    if (!fs.existsSync(resumeFile)) {
      throw new Error(`File not found: ${resumeFile}`);
    }

    console.log(`Processing file: ${resumeFile}`);
    console.log(`Original filename: ${originalFileName}`);

    // Use your existing extraction method
    console.log("Extracting resume data using existing extractor...");
    const extractedData = await extractResumeData(resumeFile, originalFileName);
    
    if (!extractedData.success || !extractedData.rawText) {
      throw new Error("Failed to extract text from resume file");
    }

    const extractedText = extractedData.rawText;
    console.log(`Successfully extracted ${extractedText.length} characters from file`);
    console.log("Text preview:", extractedText.substring(0, 200) + "...");

    // Parse and enhance candidate information using AI
    console.log("Parsing and enhancing candidate information with AI...");
    const candidateInfo = await parseCandidateInfo(extractedText, extractedData);
    console.log("Final parsed info:", candidateInfo);

    // Generate cover letter using the enhanced information
    console.log("Generating cover letter...");
    const prompt = `
    Write a professional, personalized cover letter for the following candidate:

    Candidate Information:
    Name: ${candidateInfo.name || "N/A"}
    Skills: ${candidateInfo.skills?.join(", ") || "N/A"}
    Experience: ${candidateInfo.experience || "N/A"}
    Education: ${candidateInfo.education || "N/A"}

    Job Description:
    ${jobDescription}

    The cover letter should:
    - Be tailored to the job description
    - Highlight relevant skills and experience from the candidate's background
    - Maintain a professional tone
    - Be around 250–300 words
    - Include proper greeting and closing
    - Show enthusiasm for the role
    - Connect the candidate's experience to the job requirements

    Important:
    - Return the cover letter as plain text.
    - Do not include markdown formatting.
    - Do not use double newlines (\n\n). Use single line breaks if needed.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5006",
        "X-Title": "SkillSnap Resume App"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free", 
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawCoverLetter = data.choices?.[0]?.message?.content || "Error: No cover letter generated.";
    const cleanedCoverLetter = rawCoverLetter
      .replace(/\n{2,}/g, "\n")  // turn double newlines into single
      .trim();
    return {
      coverLetter: cleanedCoverLetter || "Error: No cover letter generated.",
      candidateInfo: candidateInfo,
      extractedText: extractedText.substring(0, 500) + "...", 
      extractionMethod: getFileTypeFromExtension(originalFileName || resumeFile)
    };

  } catch (error) {
    console.error("Error in generateCoverLetter:", error);
    throw error;
  }
}

// Helper function to determine file type
function getFileTypeFromExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) return 'Image (OCR)';
  if (['.doc', '.docx'].includes(ext)) return 'Word Document';
  return 'Auto-detected';
}
