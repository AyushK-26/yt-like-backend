import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";

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

export { publishAVideo };
