import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

// get user details: username, email, fullName, password, avatar, coverImage
// validate username, email, fullName, password - not empty
// validate username, email are unique
// check for images, check for avatar
// save avatar, images in cloudinary and get url
// create document and store in DB
// remove password and refresh token field from response
// check for user creation
// send response
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;

  // console.dir(req.body);

  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email");
  }

  if (password.length < 8 || password.length > 20) {
    throw new ApiError(400, "Password must be 8-20 characters long");
  }

  const existedUser = await User.findOne({
    $or: [
      {
        username: username.toLowerCase(),
      },
      { email },
    ],
  });

  // console.dir(existedUser);

  // console.dir(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // console.dir(avatarLocalPath);

  if (existedUser) {
    fs.unlinkSync(avatarLocalPath);
    fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(409, "User with email or username already exists");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
