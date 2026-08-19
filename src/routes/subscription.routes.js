import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  subscribeChannel,
  unsubscribeChannel,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply "verifyJWT" middleware to all routes in this file
router.use(verifyJWT);

router.route("/:channelId").post(subscribeChannel).delete(unsubscribeChannel);
router.route("/subscribers/:channelId").get(getUserChannelSubscribers);
router.route("/subscribed-channels/:subscriberId").get(getSubscribedChannels);

export default router;
