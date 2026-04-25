import { Model } from "mongoose";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";

export type IUser = {
  name: string;
  role?: USER_ROLES;
  email?: string;
  profileImage?: string;
  coverImage?: string;
  password: string;
  verified: boolean;
  phone: string;
  countryCode?: string;
  city: string;
  gender?: GENDER;
  status?: STATUS;
  firebaseUid?: string;
  deviceToken?: string;
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
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
