import { STATUS, USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload, Secret } from "jsonwebtoken";
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import QueryBuilder from "../../builder/queryBuilder";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import bcrypt from "bcrypt";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_REFERENCE_MODEL, NOTIFICATION_TYPE } from "../notification/notification.constant";
import { twilioService } from "../twilioService/sendOtpWithVerify";
import { normalizeIdentifier } from "../auth/auth.service";


// --- ADMIN SERVICES ---
const createAdminToDB = async (payload: any): Promise<IUser> => {
  delete payload.phone;

  const isExistAdmin = await User.findOne({ email: payload.email });

  if (isExistAdmin) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  // ⚠️ IMPORTANT: password must come from payload (or generate if needed)
  const rawPassword = payload.password;

  const adminPayload = {
    ...payload,
    verified: true,
    status: STATUS.ACTIVE,
    role: USER_ROLES.ADMIN,
  };

  const createAdmin = await User.create(adminPayload);

  // ---------------- EMAIL TEMPLATE ----------------
  const emailHtml = `
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:#22143b;padding:25px;text-align:center;color:#ffffff;">
                <h2 style="margin:0;">Admin Account Created</h2>
                <p style="margin:5px 0 0 0;font-size:13px;">Welcome to GiftBox Admin Panel</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px;color:#333;font-size:15px;line-height:1.6;">

                <p>Hello <b>${payload.name || "Admin"}</b>,</p>

                <p>Your admin account has been created successfully.</p>

                <table style="width:100%;margin-top:20px;">
                  <tr>
                    <td style="padding:8px 0;font-weight:bold;width:120px;">Email:</td>
                    <td>${payload.email}</td>
                  </tr>

                  <tr>
                    <td style="padding:8px 0;font-weight:bold;">Password:</td>
                    <td style="background:#f0f0f0;padding:8px;border-radius:5px;">
                      ${rawPassword}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:8px 0;font-weight:bold;">Role:</td>
                    <td>ADMIN</td>
                  </tr>
                </table>

                <div style="margin-top:25px;text-align:center;">
                  <a href="${config.dashboard_url}/dashboard" 
                    style="background:#22143b;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Login to Dashboard
                  </a>
                </div>

                <p style="margin-top:25px;font-size:13px;color:#777;">
                  ⚠️ Please change your password after first login for security.
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f2f2f2;text-align:center;padding:15px;font-size:12px;color:#888;">
                © ${new Date().getFullYear()} GiftBox. All rights reserved.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
  `;

  await emailHelper.sendEmail({
    to: payload.email,
    subject: "Your Admin Account Credentials - GiftBox",
    html: emailHtml,
  });

  return createAdmin;
};

const getAdminFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: { $in: [USER_ROLES.ADMIN] },
    status: STATUS.ACTIVE,
    verified: true,
  }).select("name email role profileImage createdAt updatedAt status");

  const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
    .search(["name", "email"])
    .sort()
    .fields()
    .paginate();

  const admins = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    data: admins,
    meta,
  };
};

const updateAdminStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.ADMIN,
  });
  if (!user) {
    throw new ApiError(404, "No admin is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
};

const deleteAdminFromDB = async (id: any) => {
  const isExistAdmin = await User.findByIdAndDelete(id);

  if (!isExistAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete Admin");
  }

  return isExistAdmin;
};


// --- USER SERVICES ---


const createUserToDB = async (payload: any) => {
  const { email, phone } = payload;

  const identifier = email || phone;

  if (!identifier) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Email or phone is required"
    );
  }

  if(!payload.city){
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "City is required"
    );
  }

  /* ================= DUPLICATE CHECK ================= */
  const orConditions: any[] = [];

  if (email) {
    orConditions.push({ email: normalizeIdentifier(email) });
  }

  if (phone) {
    orConditions.push({ phone: normalizeIdentifier(phone) });
  }

  const isExistUser = await User.findOne({ $or: orConditions });

  if (isExistUser) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Email or phone already exists"
    );
  }

  /* ================= CLEAN USER DATA ================= */
  const userData = {
    name: payload.name,
    email: email ? normalizeIdentifier(email) : undefined,
    phone: phone ? normalizeIdentifier(phone) : undefined,
    countryCode: payload.countryCode,
    password: payload.password,
    verified: false,
  };

  /* ================= CREATE USER ================= */
  const createUser = await User.create(userData);

  if (!createUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to create user"
    );
  }

  /* ================= OTP GENERATION (NON-BLOCKING) ================= */
  const otp = generateOTP();

  createUser.authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  } as any;

  await createUser.save();

  /* ================= SEND OTP ================= */

  if (createUser.email) {
    const values = {
      name: createUser.name,
      otp,
      email: createUser.email,
    };

    const template = emailTemplate.createAccount(values);
    await emailHelper.sendEmail(template);
  } else if (createUser.phone) {
    if (!createUser.countryCode) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Country code is required"
      );
    }

    await twilioService.sendOTPWithVerify(
      createUser.phone,
      createUser.countryCode
    );
  }

  /* ================= JWT TOKEN ================= */
  const token = jwtHelper.createToken(
    {
      id: createUser._id,
      email: createUser.email,
      phone: createUser.phone,
      role: createUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  /* ================= ADMIN NOTIFICATION ================= */
  const admin = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("_id name");

  if (admin) {
    await sendNotifications({
      title: "New User Signup",
      text: "New user signed up successfully",
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: createUser._id.toString(),
      referenceModel: NOTIFICATION_REFERENCE_MODEL.USER,
    });
  }

  return {
    token,
    user: createUser,
  };
};

const getUserProfileFromDB = async (user: JwtPayload): Promise<any> => {
  const { id } = user;

  const isExistUser: any = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const profile: any = { ...isExistUser.toObject() };
  return profile;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
  if (payload.profileImage && isExistUser.profileImage) {
    unlinkFile(isExistUser.profileImage);
  }

  if (payload.coverImage && isExistUser.coverImage) {
    unlinkFile(isExistUser.coverImage);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return updateDoc;
};



const getAllUsersFromDB = async (query: any) => {
  // Base user query
  const baseQuery = User.find({
    role: USER_ROLES.USER,
    verified: true,
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["name", "email"])
    .sort()
    .fields()
    .filter()
    .paginate();

  // Fetch paginated users
  const users = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  if (!users || users.length === 0)
    throw new ApiError(404, "No users are found in the database");




  return {
    data: users,
    meta,
  };
};

const getUserByIdFromDB = async (id: string) => {
  const result = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });

  if (!result)
    throw new ApiError(404, "No user is found in the database by this ID");

  return result;
};

const updateUserStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });
  if (!user) {
    throw new ApiError(404, "No user is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
};

const deleteUserByIdFromD = async (id: string) => {
  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });

  if (!user) {
    throw new ApiError(404, "User doest not exist in the database");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete user by this ID");
  }

  return result;
};

const deleteProfileFromDB = async (id: string, password: string) => {
  // user exists?
  const user = await User.findById(id).select("+password");
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // check password
  const isPasswordMatch = await bcrypt.compare(password, user.password!);
  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Password is incorrect!");
  }

  // delete user
  const result = await User.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(400, "Failed to delete this user");
  }

  return result;
};

export const UserService = {
  createUserToDB,
  getAdminFromDB,
  deleteAdminFromDB,
  getUserProfileFromDB,
  getAllUsersFromDB,
  getUserByIdFromDB,
  updateProfileToDB,
  createAdminToDB,
  updateUserStatusByIdToDB,
  updateAdminStatusByIdToDB,
  deleteUserByIdFromD,
  deleteProfileFromDB,
};
