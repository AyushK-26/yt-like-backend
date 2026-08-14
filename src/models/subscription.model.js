import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    // who is subscribing
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // subscribing to
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
