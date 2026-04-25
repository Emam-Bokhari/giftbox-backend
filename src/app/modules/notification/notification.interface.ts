import { Model, Types } from "mongoose";

export type INotification = {
  title: string;
  text: string;
  receiver?: Types.ObjectId | string;
  sender?: Types.ObjectId | string;
  read: boolean;
  referenceId?: Types.ObjectId | string;
  referenceModel?: "Booking" | "Car" | "Review" | "User";
  type?: string;
};

export type NotificationModel = Model<INotification>;
