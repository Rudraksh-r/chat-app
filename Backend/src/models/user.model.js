import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const userSchema = new Schema(
    {
        usermane: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        avatar: {
            type: String,
            default: ""
        }
    }, { timestamps: true }) 