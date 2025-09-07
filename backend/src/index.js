import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './utils/db.js';
import cors from 'cors';
import analyzeRoutes from './routes/analyzeRoutes.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import path from 'path';
import fs from "fs";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const __dirname = path.resolve();

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

if(process.env.NODE_ENV === "production") {
    console.log("Setting up production static files...");
    try {
        app.use(express.static(path.join(__dirname, "../frontend/dist")));
        console.log("✅ Static files configured");
        
        // Use a more specific pattern for SPA routing
        app.get(/^(?!\/api).*/, (req, res) => {
            res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
        });
        console.log("✅ SPA routing configured");
    } catch (error) {
        console.error("❌ Error setting up production routes:", error.message);
    }
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
