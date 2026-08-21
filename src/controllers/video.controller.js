import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  removeFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
import fs from "fs";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title.trim() || !description.trim()) {
    throw new ApiError(400, "All fields are required");
  }

  const videoLocalPath = req.files?.video?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video and thumbnail files are required");
  }

  const uploadedVideo = await uploadOnCloudinary(videoLocalPath);
  const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!uploadedVideo || !uploadedThumbnail) {
    throw new ApiError(
      500,
      "Something went wrong while uploading video or thumbnail on cloudinary"
    );
  }

  //   uploadedVideo.duration: duration in seconds
  //   console.log(uploadedVideo);

  const video = await Video.create({
    title,
    description,
    videoFile: {
      url: uploadedVideo.url,
      public_id: uploadedVideo.public_id,
    },
    thumbnail: {
      url: uploadedThumbnail.url,
      public_id: uploadedThumbnail.public_id,
    },
    owner: req.user._id,
    duration: uploadedVideo.duration,
  });

  //   console.log(video);

  if (!video) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const videoId = req.params?.videoId?.trim();

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const videoId = req.params?.videoId?.trim();
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  const trimmedTitle = title?.trim();
  const trimmedDescription = description?.trim();

  try {
    if (!videoId) {
      throw new ApiError(400, "Video ID is required");
    }

    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // console.log(typeof video.owner, video.owner);
    // console.log(typeof req.user._id, req.user._id);

    if (!video.owner.equals(req.user._id)) {
      throw new ApiError(403, "Video is not owned by the logged in user");
    }

    if (!trimmedTitle && !trimmedDescription && !thumbnailLocalPath) {
      throw new ApiError(400, "Title, description or thumbnail is required");
    }

    const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    const oldThumbnailPublicId = video.thumbnail?.public_id;

    if (trimmedTitle) {
      video.title = trimmedTitle;
    }

    if (trimmedDescription) {
      video.description = trimmedDescription;
    }

    if (newThumbnail) {
      video.thumbnail = {
        url: newThumbnail.url,
        public_id: newThumbnail.public_id,
      };
    }

    const updatedVideo = await video.save();

    if (!updatedVideo) {
      throw new ApiError(
        500,
        "Something went wrong while updating video details"
      );
    }

    if (newThumbnail) {
      await removeFromCloudinary(oldThumbnailPublicId, "image");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedVideo, "Video details updated successfully")
      );
  } finally {
    if (thumbnailLocalPath && fs.existsSync(thumbnailLocalPath)) {
      fs.unlinkSync(thumbnailLocalPath);
    }
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const videoId = req.params?.videoId?.trim();

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(403, "Video is not owned by the logged in user");
  }

  await video.deleteOne();

  await removeFromCloudinary(video.videoFile?.public_id, "video");
  await removeFromCloudinary(video.thumbnail?.public_id, "image");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const videoId = req.params?.videoId?.trim();

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(403, "Video is not owned by the logged in user");
  }

  video.isPublished = !video.isPublished;

  const toggledVideo = await video.save();

  if (!toggledVideo) {
    throw new ApiError(
      500,
      "Something went wrong while changing publish status"
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isPublished: video.isPublished,
      },
      "Publish status toggled successfully"
    )
  );
});

export {
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
