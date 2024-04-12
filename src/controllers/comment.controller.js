import mongoose, { isValidObjectId } from "mongoose"
import { asyncHandler } from "../utils/asyncHandler"
import { Comment } from "../models/comment.model"
import { ApiError } from "../utils/ApiError"
import { Video } from "../models/video.model"
import { User } from "../models/user.model"

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params
  const { page = 1, limit = 10 } = req.query
  const comments = await Comment.find({
    video: videoId,
  })

  if (!comments.length) {
    throw new ApiError(400, "no comments")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params
  if (!isValidObjectId(videoId)) throw new ApiError(404, "invalid video id")

  const { content } = req.body
  if (content?.trim() === "") throw new ApiError(404, "content is required")

  const [video, user] = await Promise.all([
    Video.findById(videoId),
    User.findById(req.user?._id),
  ])

  if (!user) throw new ApiError(404, "User not found")
  if (!video) throw new ApiError(404, "Video not found")

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  })

  if (!comment)
    throw new ApiError(500, "Something went wrong while adding comment")

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment Added Successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params
  if (!isValidObjectId(commentId))
    throw new ApiError(404, "Not found comment for this id")

  const comment = await Comment.findById(commentId, { _id: 1 })
  if (!comment) throw new ApiError(404, "Not found comment for this id")

  const { content } = req.body
  if (content?.trim() === "") throw new ApiError(404, "content is required")

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  )

  if (!updateComment)
    throw new ApiError(500, "Something went wrong while updating comment")

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment Updated Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
})

export { getVideoComments, addComment, updateComment, deleteComment }
