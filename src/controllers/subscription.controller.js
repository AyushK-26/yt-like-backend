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

  const channel = await User.findById(channelId).select("_id");

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.find({
    channel: channelId,
  })
    .select("subscriber -_id")
    .populate("subscriber", "username avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriberId = req.params?.subscriberId?.trim();

  if (!subscriberId) {
    throw new ApiError(400, "Subscriber ID is required");
  }

  if (!mongoose.isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscriber = await User.findById(subscriberId).select("_id");

  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  const subscribedTo = await Subscription.find({
    subscriber: subscriberId,
  })
    .select("channel -_id")
    .populate("channel", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, subscribedTo, "Channels fetched successfully"));
});

export {
  subscribeChannel,
  unsubscribeChannel,
  getUserChannelSubscribers,
  getSubscribedChannels,
};
