import { Router } from "express";
import {
  subscribeChannel,
  unsubscribeChannel,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/subscribe").post(verifyJWT, subscribeChannel);
router.route("/unsubscribe").delete(verifyJWT, unsubscribeChannel);

export default router;
