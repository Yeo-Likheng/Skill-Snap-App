import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './utils/db.js';
import cors from 'cors';
import analyzeRoutes from './routes/analyzeRoutes.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import path from 'path';
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT;
app.set("trust proxy", 1);


const uploadsDir = path.join(__dirname, "../uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

app.use('/api/auth', authRoutes);
app.use('/api/resumes', analyzeRoutes);

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads", { recursive: true });
}

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "../../frontend/dist"); 
  app.use(express.static(frontendDist));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  console.log("Running in development mode");
}

await connectDB()
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("MongoDB connection error: ", error);
        process.exit(1);
    });

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
