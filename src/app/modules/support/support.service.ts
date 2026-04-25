import { Types } from "mongoose";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { emailHelper } from "../../../helpers/emailHelper";
import { ISendEmail } from "../../../types/email";
import { User } from "../user/user.model";
import { TSupport } from "./support.interface";
import { Support } from "./support.model";
import QueryBuilder from "../../builder/queryBuilder";

const support = async (id: string, payload: TSupport) => {
  const user = await User.isExistUserById(id);

  if (!user) {
    throw new ApiError(404, "No user is found in the database");
  }

  payload.userId = new Types.ObjectId(id);

  payload.name = user.name || "Unknown";

  const supportEntry = await Support.create(payload);

  const emailPayload: ISendEmail = {
    to: config.support_receiver_email || "enquiry@gogreenmatrix.com",
    subject: `GoGreenMatrix Support Request: ${payload.subject}`,
    html: `
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#ffffff;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:12px;
          box-shadow:0 8px 24px rgba(0,0,0,0.06);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:30px 20px;background:#a90707;color:#ffffff;">
              <h1 style="margin:0;font-size:22px;font-weight:600;letter-spacing:1px;">
                GoGreenMatrix
              </h1>
              <p style="margin:5px 0 0 0;font-size:13px;opacity:0.9;">
                Support Request Notification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px 30px;color:#363636;font-size:15px;line-height:1.6;">

              <p style="margin-bottom:10px;">
                A new support request has been submitted from the platform.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="padding:8px 0;font-weight:bold;width:150px;">Requester Name:</td>
                  <td style="padding:8px 0;">${payload.name || "Unknown"}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Requester Email:</td>
                  <td style="padding:8px 0;">${payload.email}</td>
                </tr>

                <tr>
                  <td style="padding:8px 0;font-weight:bold;">Subject:</td>
                  <td style="padding:8px 0;">${payload.subject}</td>
                </tr>
              </table>

              <div style="margin-top:25px;">
                <p style="margin-bottom:6px;font-weight:bold;">Message:</p>

                <div style="
                  background:#f8f8f8;
                  padding:18px;
                  border-left:4px solid #a90707;
                  border-radius:4px;
                  font-size:14px;
                  line-height:1.6;
                ">
                  ${payload.message}
                </div>
              </div>

              <div style="text-align:center;margin-top:35px;">
                <a
                  href="mailto:${payload.email}"
                  style="
                    background:#a90707;
                    color:#ffffff;
                    padding:14px 24px;
                    border-radius:6px;
                    text-decoration:none;
                    font-size:15px;
                    display:inline-block;
                    font-weight:600;
                  "
                >
                  Reply to ${payload.name || "Unknown"}
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="padding:20px;font-size:12px;color:#888;background:#f7f7f7;">
              © ${new Date().getFullYear()} GoGreenMatrix. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
`,
  };

  await emailHelper.sendEmail(emailPayload);

  return supportEntry;
};

const getAllSupportsFromDB = async (query: any) => {
  const baseQuery = Support.find().populate({
    path: "userId",
    select: "_id firstName lastName email phone role profileImage",
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["name email subject userId"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const supports = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  if (!supports || supports.length === 0) {
    throw new ApiError(404, "Supports data are not found in the database");
  }

  return {
    data: supports,
    meta,
  };
};

const getSupportByIdFromDB = async (id: string) => {
  const support = await Support.findById(id).populate({
    path: "userId",
    select: "firstName lastName role profileImage email _id phone",
  });

  if (!support) {
    throw new ApiError(404, "No support is found by this ID");
  }

  return support;
};

const deleteSupportByIdFromDB = async (id: string) => {
  const support = await Support.findByIdAndDelete(id);
  if (!support) {
    throw new ApiError(400, "Failed to delete this support by this ID");
  }

  return support;
};

export const SupportServices = {
  support,
  getAllSupportsFromDB,
  getSupportByIdFromDB,
  deleteSupportByIdFromDB,
};
