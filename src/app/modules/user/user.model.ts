// import { model, Schema } from "mongoose";
// import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";
// import { IUser, UserModal } from "./user.interface";
// import bcrypt from "bcrypt";
// import config from "../../../config";

// /* ================= USER SCHEMA ================= */
// const userSchema = new Schema<IUser, UserModal>(
//   {
//     name: {
//       type: String,
//       required: true,
//     },

//     role: {
//       type: String,
//       enum: Object.values(USER_ROLES),
//       default: USER_ROLES.USER,
//     },

//     /* ================= HYBRID IDENTITY ================= */
//     email: {
//       type: String,
//       lowercase: true,
//       trim: true,
//       sparse: true,   // IMPORTANT (fix unique conflict)
//     },

//     phone: {
//       type: String,
//       sparse: true,   // IMPORTANT (fix unique conflict)
//     },

//     countryCode: {
//       type: String,
//       default: "+223",
//     },

//     /* ================= SECURITY ================= */
//     password: {
//       type: String,
//       select: 0,
//       minlength: 8,
//     },

//     verified: {
//       type: Boolean,
//       default: false,
//     },

//     status: {
//       type: String,
//       enum: Object.values(STATUS),
//       default: STATUS.ACTIVE,
//     },

//     /* ================= PROFILE ================= */
//     profileImage: {
//       type: String,
//       default: "",
//     },

//     coverImage: {
//       type: String,
//       default: "",
//     },

//     city: {
//       type: String,
//       required: true,
//     },

//     gender: {
//       type: String,
//       enum: Object.values(GENDER),
//     },

//     firebaseUid: {
//       type: String,
//       unique: true,
//       sparse: true,
//     },

//     deviceToken: {
//       type: String,
//     },

//     /* ================= LOCATION ================= */
//     location: {
//       type: {
//         type: String,
//         enum: ["Point"],
//         default: "Point",
//       },
//       coordinates: {
//         type: [Number],
//         default: [0, 0],
//         index: "2dsphere",
//       },
//       address: {
//         type: String,
//         default: "",
//       },
//     },

//     /* ================= AUTH ================= */
//     authentication: {
//       type: {
//         isResetPassword: {
//           type: Boolean,
//           default: false,
//         },
//         oneTimeCode: {
//           type: Number,
//           default: null,
//         },
//         expireAt: {
//           type: Date,
//           default: null,
//         },
//         authType: {
//           type: String,
//           default: null,
//         },
//       },
//       select: 0,
//     },
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//   }
// );

// /* ================= STATIC METHODS ================= */
// userSchema.statics.isExistUserById = async function (id: string) {
//   return await this.findById(id);
// };

// userSchema.statics.isExistUserByEmail = async function (email: string) {
//   return await this.findOne({ email });
// };

// userSchema.statics.isMatchPassword = async function (
//   password: string,
//   hashPassword: string
// ) {
//   return await bcrypt.compare(password, hashPassword);
// };

// /* ================= PASSWORD HASH ================= */
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   if (this.password) {
//     this.password = await bcrypt.hash(
//       this.password,
//       Number(config.bcrypt_salt_rounds)
//     );
//   }

//   next();
// });

// export const User = model<IUser, UserModal>("User", userSchema);

import { model, Schema } from "mongoose";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";
import { IUser, UserModal } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../../config";

/* ================= USER SCHEMA ================= */
const userSchema = new Schema<IUser, UserModal>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },

    /* ================= HYBRID IDENTITY ================= */
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },

    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },

    countryCode: {
      type: String,
      default: "+223",
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    /* ================= SECURITY ================= */
    password: {
      type: String,
      select: false,
      minlength: 8,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },

    /* ================= PROFILE ================= */
    profileImage: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      required: false,
      trim: true,
    },

    gender: {
      type: String,
      enum: Object.values(GENDER),
    },

    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },

    deviceToken: {
      type: String,
    },

    /* ================= LOCATION ================= */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator: (v: number[]) => !v || v.length === 2,
          message: "Coordinates must be [longitude, latitude]",
        },
      },
      address: {
        type: String,
        default: "",
      },
    },

    /* ================= AUTH ================= */
    authentication: {
      type: {
        isResetPassword: { type: Boolean, default: false },
        oneTimeCode: { type: Number, default: null },
        expireAt: { type: Date, default: null },
      },
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ================= INDEX ================= */
userSchema.index({ email: 1, phone: 1 });

/* ================= STATIC METHODS ================= */
userSchema.statics.isExistUserById = async function (id: string) {
  return await this.findById(id);
};

userSchema.statics.isExistUserByEmail = async function (email: string) {
  return await this.findOne({ email });
};

userSchema.statics.isExistUserByPhone = async function (phone: string) {
  return await this.findOne({ phone });
};

userSchema.statics.isMatchPassword = async function (
  password: string,
  hashPassword: string
) {
  return await bcrypt.compare(password, hashPassword);
};

/* ================= PASSWORD HASH ================= */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (this.password) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds)
    );
  }

  next();
});

export const User = model<IUser, UserModal>("User", userSchema);