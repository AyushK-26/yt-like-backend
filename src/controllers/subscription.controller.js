import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const subscribeChannel = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (username?.trim() == "") {
    throw new ApiError(400, "Channel name is required");
  }

  const channel = await User.findOne({
    username: username.toLowerCase(),
  });

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
  const { username } = req.body;

  if (username?.trim() == "") {
    throw new ApiError(400, "Channel name is required");
  }

  const channel = await User.findOne({
    username: username.toLowerCase(),
  });

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

export { subscribeChannel, unsubscribeChannel };
