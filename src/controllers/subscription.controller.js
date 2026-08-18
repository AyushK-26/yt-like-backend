import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const subscribeChannel = asyncHandler(async (req, res) => {
  const channelId = req.params?.channelId?.trim();

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channel._id,
  });

  if (existingSubscription) {
    throw new ApiError(409, "Channel is already subscribed");
  }

  const subscription = await Subscription.create({
    subscriber: req.user._id,
    channel: channel._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, subscription, "Subscribed successfully"));
});

const unsubscribeChannel = asyncHandler(async (req, res) => {
  const channelId = req.params?.channelId?.trim();

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscription = await Subscription.findOneAndDelete({
    subscriber: req.user._id,
    channel: channel._id,
  });

  if (!subscription) {
    throw new ApiError(409, "Channel is not subscribed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Unsubscribed successfully"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const channelId = req.params?.channelId?.trim();

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const userChannelSubscribers = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              channel: 0,
            },
          },
        ],
      },
    },
    {
      $project: {
        subscribers: 1,
      },
    },
  ]);

  if (!userChannelSubscribers.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userChannelSubscribers[0].subscribers,
        "Subscribers fetched successfully"
      )
    );
});

export { subscribeChannel, unsubscribeChannel, getUserChannelSubscribers };
