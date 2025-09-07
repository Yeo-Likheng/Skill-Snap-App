import path from 'path';
import puppeteer from "puppeteer";
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Categories to scrape (reduced for testing)
const categories = [
  "Vue", "Angular", "SASS", "MySQL", "SQLite", "Oracle", "GCP",
  "Jenkins", "Git", "GitHub", "REST API", "Linux", "Data Analysis", "Statistics",
  "Django", "Flask", "Pandas", "NumPy", "Scikit-learn", "Matplotlib", "Seaborn",
  "Jest", "Mocha", "Cypress", "Selenium", "JUnit", "PyTest", "Postman",
  "Unit Testing", "Unix", "Bash", "PowerShell", "Spring Boot"
];

// Helper: remove duplicates
function removeDuplicates(courses) {
  const seen = new Set();
  return courses.filter(course => {
    const key = course.title + course.platform;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper: minimal scroll - just enough to load 6 courses
async function quickScroll(page) {
  try {
    await page.evaluate(() => {
      // Quick scroll to trigger lazy loading
      window.scrollTo(0, 1000);
      window.scrollTo(0, 2000);
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.warn('Quick scroll failed:', error.message);
  }
}

// Create a new page with aggressive optimization
async function createNewPage(browser) {
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });
  
  // Aggressive request blocking for speed
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Set shorter timeouts
  page.setDefaultNavigationTimeout(15000);
  page.setDefaultTimeout(10000);

  return page;
}

// Scrape Coursera
async function scrapeCoursera(browser, category) {
  let page = null;
  const url = `https://www.coursera.org/search?query=${encodeURIComponent(category)}`;
  let retries = 3;
  let courses = [];

  while (retries > 0) {
    try {
      // Create a fresh page for each attempt
      if (page) {
        await page.close().catch(() => {});
      }
      page = await createNewPage(browser);
      
      console.log(`Scraping Coursera for "${category}"...`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });
      
      // Minimal wait and scroll
      await quickScroll(page);
      
      // Wait for content with shorter timeout
      await page.waitForSelector('li.cds-9, [data-testid="search-results-container"]', { 
        timeout: 10000 
      });

      courses = await page.evaluate((category) => {
        const items = document.querySelectorAll('li.cds-9');
        const courses = [];
        
        items.forEach((item, index) => {
          // Limit to 6 courses per category
          if (courses.length >= 6) return;
          
          try {
            const linkEl = item.querySelector('a[href*="/learn/"]') || 
                          item.querySelector('a[href*="/specializations/"]') ||
                          item.querySelector('a[href*="/professional-certificates/"]') ||
                          item.querySelector('.cds-CommonCard-titleLink');
                          
            const titleEl = item.querySelector('h3') || 
                           item.querySelector('[data-testid="course-name"]') ||
                           item.querySelector('.cds-CommonCard-title');
            
            if (linkEl && titleEl) {
              let skill = category;
              const skillText = item.querySelector('.css-kimdhf, [data-testid="skills"]');
              if (skillText) {
                const skillsMatch = skillText.textContent.replace(/Skills you'll gain:?/i, "").trim();
                if (skillsMatch) skill = skillsMatch.split(',')[0].trim();
              }

              const href = linkEl.getAttribute('href');
              const fullUrl = href.startsWith('http') ? href : `https://www.coursera.org${href}`;

              const imageElement = item.querySelector('.cds-CommonCard-previewImage img') ||
                                 item.querySelector('img[src*="imageproxy"]') ||
                                 item.querySelector('img');
              const imageUrl = imageElement ? imageElement.getAttribute('src') : '';

              courses.push({
                title: titleEl.textContent.trim(),
                platform: "Coursera",
                url: fullUrl,
                image: imageUrl, 
                skill: skill
              });
            }
          } catch (itemError) {
            // Skip individual items that fail
            console.warn('Failed to process Coursera item:', itemError.message);
          }
        });
        
        return courses;
      }, category);

      console.log(`✅ Coursera ${category}: ${courses.length} courses found`);
      break; // success

    } catch (err) {
      console.warn(`❌ Coursera retry for "${category}", attempts left: ${retries-1}. Error: ${err.message}`);
      retries--;
      if (retries === 0) {
        console.error(`Failed to scrape Coursera for "${category}" after all retries`);
        courses = []; // Return empty array instead of throwing
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  // Clean up page
  if (page) {
    await page.close().catch(() => {});
  }

  return courses;
}



// Main function
async function main() {
  const browser = await puppeteer.launch({ 
    headless: true,
    protocolTimeout: 60000, // Increase timeout to 60 seconds
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  let allCourses = [];

  try {
    // Scrape Coursera
    console.log('🚀 Starting Coursera scraping...');
    for (const category of categories) {
      try {
        const courses = await scrapeCoursera(browser, category);
        allCourses = allCourses.concat(courses);
        
        // Minimal delay between categories
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to scrape Coursera for ${category}:`, error.message);
      }
    } 

    // Remove duplicates and calculate total
    allCourses = removeDuplicates(allCourses);
    
    console.log(`✅ Successfully scraped ${allCourses.length} total courses`);
    console.log(`📊 Breakdown: ${allCourses.filter(c => c.platform === 'Coursera').length} Coursera`);
    console.log(`📈 Expected: ${categories.length * 2 * 6} courses (${categories.length} categories × 1 platforms × 6 courses each)`);

    // Ensure utils directory exists
    const utilsDir = path.join(__dirname, 'utils');
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }

    // Save in utils folder
    const filePath = path.join(utilsDir, 'courses.json');
    fs.writeFileSync(filePath, JSON.stringify(allCourses, null, 2));
    
    console.log(`✅ Successfully saved ${allCourses.length} courses to utils/courses.json`);
    console.log(`📊 Breakdown: ${allCourses.filter(c => c.platform === 'Coursera').length} Coursera`);

  } catch (error) {
    console.error('❌ Main function error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);