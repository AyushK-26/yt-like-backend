import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  removeFromCloudinary,
} from "../utils/cloudinary.js";
import fs, { access } from "fs";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

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

  // console.dir(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // console.dir(existedUser);

  if (existedUser) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(409, "User with email or username already exists");
  }

  // console.dir(avatarLocalPath);

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
    avatar: {
      url: avatar.url,
      public_id: avatar.public_id,
    },
    coverImage: {
      url: coverImage?.url || "",
      public_id: coverImage?.public_id || "",
    },
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

// receive email and password
// validate email and password are not empty
// validate email is in correct format
// validate user exists
// compare password
// generate access & refresh token
// send cookie
// send acknowledgement
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  if (password.trim() == "") {
    throw new ApiError(400, "Password is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email");
  }

  const user = await User.findOne({
    $or: [
      {
        username: username.toLowerCase(),
      },
      { email },
    ],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

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
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: undefined },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id).select("-password");

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Tokens refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (oldPassword.trim() == "" || newPassword.trim() == "") {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  const user = await User.findById(req.user._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler((req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  // save new avatar on cloudinary
  const newAvatar = await uploadOnCloudinary(avatarLocalPath);

  if (!newAvatar) {
    throw new ApiError(
      500,
      "Something went wrong while uploading new avatar on cloudinary"
    );
  }

  // store old avatar public id to remove old avatar from cloudinary later
  const oldAvatarPublicId = user.avatar?.public_id;

  // update user object with new avatar & save in database
  user.avatar = {
    url: newAvatar.url,
    public_id: newAvatar.public_id,
  };
  const updatedUser = await user.save({ validateBeforeSave: false });

  // remove old avatar from cloudinary after new avatar is uploaded on cloudinary and saved in database
  await removeFromCloudinary(oldAvatarPublicId);

  res
    .status(200)
    .json(new ApiResponse(200, { updatedUser }, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  // save new cover image on cloudinary
  const newCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!newCoverImage) {
    throw new ApiError(
      500,
      "Something went wrong while uploading new cover image on cloudinary"
    );
  }

  // store old cover image public id to remove old cover image from cloudinary later
  const oldCoverImagePublicId = user.coverImage?.public_id;

  // update user object with new cover image & save in database
  user.coverImage = {
    url: newCoverImage.url,
    public_id: newCoverImage.public_id,
  };
  const updatedUser = await user.save({ validateBeforeSave: false });

  // remove old cover image from cloudinary after new cover image is uploaded on cloudinary and saved in database
  await removeFromCloudinary(oldCoverImagePublicId);

  res
    .status(200)
    .json(
      new ApiResponse(200, { updatedUser }, "Cover image updated successfully")
    );
});

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
};
