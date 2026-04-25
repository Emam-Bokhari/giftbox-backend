import { Types } from "mongoose";

export type TSupport = {
  userId: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
};
