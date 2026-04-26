import { model, Schema } from "mongoose";
import { TSupport } from "./support.interface";
import { SUPPORT_STATUS } from "./support.constant";

const supportSchema = new Schema<TSupport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    attachment: {
      type: String,
      default: "",
      required: false,
    },
    status: {
      type: String,
      enum: Object.values(SUPPORT_STATUS),
      default: SUPPORT_STATUS.PENDING,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Support = model("Support", supportSchema);
