import { Model } from "mongoose";
import { STATUS, USER_ROLES } from "../../../enums/user";

export type IUser = {
  name: string;
  role: USER_ROLES;
  email: string;
  profileImage?: string;
  coverImage?: string;
  password?: string;
  verified: boolean;
  membershipId?: string;
  phone?: string;
  status: STATUS;
  firebaseUid?: string;
  userName?: string;
  deviceToken?: string;
  stripeConnectedAccountId?: string;
  isStripeOnboarded?: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude],
    address: string;
  };
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
};


export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isAccountCreated(id: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
