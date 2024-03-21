import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { z } from "zod"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const check = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: "ok",
  })
})

const userSchema = z.object({
  username: z.string().trim(),
  email: z.string().email().trim(),
  password: z.string().trim(),
  fullName: z.string().trim(),
})

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend

  console.log(req.body)
  const { success } = userSchema.safeParse(req.body)
  if (!success) {
    throw new Error("Body not parsed properly...")
  }
  const { username, email, password, fullName } = req.body

  // validation - not empty

  // check if user already exists: username, email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  })
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  console.log(req.files)
  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }



  // create user object -create entry in db
  const newUser = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  })

  // remove password and refresh token field from response
  // check for user creation

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user")
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User regsitered successfully"))
  // return res
})

export { registerUser, check }
