import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { z } from "zod"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const userSchema = z.object({
  username: z.string().trim(),
  email: z.string().email().trim(),
  password: z.string().trim(),
  fullName: z.string().trim(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken(userId)
    const refreshToken = user.generateRefreshToken(userId)

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    )
  }
}

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

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  const { success } = loginSchema.safeParse(req.body)
  if (!success) {
    throw new Error("Invalid Input")
  }
  const { email, password } = req.body
  // username or email login
  // find the user
  const user = await User.findOne({
    $or: [{ email }],
  })
  if (!user) {
    throw new ApiError(404, "User does not exists")
  }

  // password check
  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  // access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  )

  // send tokens via cookie

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  const options = {
    httpOnly: true,
    secure: true,
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  })

  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used")
    }

    const options = { httpOnly: true, secure: true }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const user = await User.findById(req.user._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse((200, user, "Account details updated!")))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password")

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated successfully."))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const localCoverImagePath = req.file?.path

  if (!localCoverImagePath) {
    throw new ApiError(400, "Cover Image is missing")
  }

  const coverImage = await uploadOnCloudinary(localCoverImagePath)

  if (!coverImage) {
    throw new ApiError(400, "Error while uploading Cover Image")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).password("-password")

  res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ])

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User Channel fecthed successfully"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
}
