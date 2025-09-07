import { generateToken } from "../utils/token.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
    const { name, email, password } = req.body;

    try{
        if(!name || !email || !password) {
            return res.status(400).json({ message: "You must fill in all the blanks!"});
        }
        if(password.length < 6){
            return res.status(400).json({message: "Password must be longer than 6 characters!"});
        }

        const user = await User.findOne({email});
        if(user){
            return res.status(400).json({message: "Email already existed!"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        const newUser = new User(
            {
                name,
                email,
                password: hashPassword,
            }
        )
        if(newUser){
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            });
        }else{
            res.status(400).json({message: "Invalid user data"});
        }
    }catch(error){
        console.log("Error in signup", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try{
        if(!email || !password){
            return res.status(400).json({message: "You must fill in all the blannks!"});
        }
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message: "Invalid credentials!"});
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if(!isPasswordCorrect){
            return res.status(400).json({message: "Invalid credentials!"});
        }

        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
        });
    }catch(error){
        console.log("Error in login", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const logout = (req, res) => {
    try{
        res.cookie("jwt", "", {maxAge: 0});
        res.status(200).json({message: "Logged out successfully!"});
    }catch(error){
        console.log("Error in logout", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const checkAuth = (req, res) => {
    try{
        res.status(200).json(req.user);
    }catch(error){
        console.log("Error in checkAuth", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}
