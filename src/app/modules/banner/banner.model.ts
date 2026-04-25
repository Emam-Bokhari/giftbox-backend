import { model, Schema } from "mongoose";
import { TBanner } from "./banner.interface";

const bannerSchema = new Schema<TBanner>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Banner = model<TBanner>("Banner", bannerSchema);
