import { User } from "../models/user.model";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessToken, generateRefreshToken } from "../utils/Token.js";

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
        throw new ApiError(400, "All feilds are required")
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }

    const user = await User.create({
        username,
        email,
        password
    })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    return res
        .status(201)
        .json(
            new ApiResponse(201, "User registered successfully", {
                user,
                accessToken,
                refreshToken
            })
        )
})

const login = asyncHandler(async (req, res) => {
    const { email, password } = res.body

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "Invaild credentials")
    }


    const isPasswordCorrect = await user.comparePassword(password)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invaild credentials")
    }

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    return res
        .status(200)
        .json(
            new ApiResponse(200, "User logged in successfully", {
                user,
                accessToken,
                refreshToken
            })
        )
})

const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-password -refreshToken"
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, "User fetched successfully", user)
        )
})

export { registerUser, login, getUser}