import { asyncHandler } from "../utils/asyncHandler.js"

const check = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: "ok",
  })
})

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "ok",
  })
})

export { registerUser,check }
