import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessToken, generateRefreshToken } from "../utils/Token.js";

const registerUser = asyncHandler(async (req, res) => {
    // req.body is already validated by registerSchema
    const { fullName, username, email, password, publicKey = null } = req.body;

    const existingUser = await User.findOne({ email })

    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // if(!avatarLocalPath){
    //     throw new ApiError(400, "Avatar is required")
    // }
    
    const user = await User.create({
        fullName,
        username,
        email,
        password,
        publicKey,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, {
                createdUser,
                accessToken,
                refreshToken
            }, "User registered successfully")
        )
})

const login = asyncHandler(async (req, res) => {
    // req.body is already validated by loginSchema
    const { email, password } = req.body;

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "Invalid credentials")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid credentials")
    }

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                loggedInUser,
                accessToken,
                refreshToken
            }, "User logged in successfully")
        )
})

const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-password -refreshToken"
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User fetched successfully")
        )
})
const changePassword = asyncHandler(async (req, res) => {
    // req.body is already validated by changePasswordSchema
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id)
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect old password")
    }

    user.password = newPassword
    await user.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        )
})

export { registerUser, login, getUser, changePassword }