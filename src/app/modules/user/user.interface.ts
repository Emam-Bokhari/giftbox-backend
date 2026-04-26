// import { Model } from "mongoose";
// import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";

// /* ================= USER ================= */
// export type IUser = {
//   name: string;

//   role?: USER_ROLES;

//   /* ================= HYBRID IDENTITY ================= */
//   email?: string;
//   phone?: string;
//   countryCode?: string;

//   password: string;

//   verified: boolean;

//   status?: STATUS;

//   /* ================= PROFILE ================= */
//   profileImage?: string;
//   coverImage?: string;

//   city: string;
//   gender?: GENDER;

//   firebaseUid?: string;
//   deviceToken?: string;

//   /* ================= LOCATION ================= */
//   location?: {
//     type: "Point";
//     coordinates: [number, number]; // [longitude, latitude]
//     address: string;
//   };

//   /* ================= AUTH ================= */
//   authentication?: {
//     isResetPassword?: boolean;
//     oneTimeCode?: number;
//     expireAt?: Date;
//     authType?: string;
//   };
// };

// /* ================= STATIC METHODS ================= */
// export type UserModal = {
//   isExistUserById(id: string): Promise<IUser | null>;

//   isExistUserByEmail(email: string): Promise<IUser | null>;

//   isExistUserByPhone(phone: string): Promise<IUser | null>;

//   isMatchPassword(
//     password: string,
//     hashPassword: string
//   ): Promise<boolean>;
// } & Model<IUser>;

import { Model } from "mongoose";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";

/* ================= USER ================= */
export type IUser = {
  name: string;

  role?: USER_ROLES;

  /* ================= HYBRID IDENTITY ================= */
  email?: string;
  phone?: string;
  countryCode?: string;
  dateOfBirth?: Date;

  password: string;

  /* ================= VERIFICATION ================= */
  verified: boolean;

  status?: STATUS;

  /* ================= PROFILE ================= */
  profileImage?: string;
  coverImage?: string;

  city?: string;
  gender?: GENDER;

  firebaseUid?: string;
  deviceToken?: string;

  /* ================= LOCATION ================= */
  location?: {
    type: "Point";
    coordinates: readonly [number, number]; // [longitude, latitude]
    address: string;
  };

  /* ================= AUTH ================= */
  authentication?: {
    isResetPassword?: boolean;
    oneTimeCode?: number;
    expireAt?: Date;
  };
};

/* ================= STATIC METHODS ================= */
export type UserModal = {
  isExistUserById(id: string): Promise<IUser | null>;
  isExistUserByEmail(email: string): Promise<IUser | null>;
  isExistUserByPhone(phone: string): Promise<IUser | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
} & Model<IUser>;
