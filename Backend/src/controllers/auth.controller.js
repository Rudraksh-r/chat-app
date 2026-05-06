import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessToken, generateRefreshToken } from "../utils/Token.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body || {}

    if (!fullName || !username || !email || !password) {
        throw new ApiError(400, "All fields are required")
    }

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

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
    const { email, password } = req.body

    if(!email || !password){
        throw new ApiError(400, "All fields are required")
    }

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

export { registerUser, login, getUser }