import { ICreateAccount, IResetPassword } from "../types/emailTemplate";

const PRIMARY_COLOR = "#a90707";
const BG_COLOR = "#ffffff";
const TEXT_COLOR = "#363636";

const baseLayout = (content: string) => `
  <body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_COLOR};padding:40px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" 
            style="max-width:600px;background:#ffffff;border-radius:12px;
            box-shadow:0 8px 24px rgba(0,0,0,0.06);overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding:30px 20px;background:${PRIMARY_COLOR};color:#ffffff;">
                <h1 style="margin:0;font-size:22px;font-weight:600;letter-spacing:1px;">
                  GoGreenMatrix
                </h1>
              </td>
            </tr>

            <!-- Dynamic Content -->
            <tr>
              <td style="padding:35px 30px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
                ${content}
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
`;

const createAccount = (values: ICreateAccount) => {
  const content = `
    <h2 style="margin-top:0;color:${TEXT_COLOR};">
      Welcome, ${values.name}
    </h2>

    <p>
      Thank you for creating an account with GoGreenMatrix.
      Please verify your email address using the code below.
    </p>

    <div style="text-align:center;margin:35px 0;">
      <div style="
        display:inline-block;
        padding:18px 30px;
        background:${PRIMARY_COLOR};
        color:#ffffff;
        font-size:26px;
        font-weight:700;
        letter-spacing:4px;
        border-radius:8px;
      ">
        ${values.otp}
      </div>
    </div>

    <p style="margin-bottom:10px;">
      This verification code will expire in <strong>3 minutes</strong>.
    </p>

    <p style="color:#888;font-size:13px;">
      If you did not create this account, please ignore this email.
    </p>
  `;

  return {
    to: values.email,
    subject: "GoGreenMatrix – Verify Your Account",
    html: baseLayout(content),
  };
};

const resetPassword = (values: IResetPassword) => {
  const content = `
    <h2 style="margin-top:0;color:${TEXT_COLOR};">
      Password Reset Request
    </h2>

    <p>
      We received a request to reset your password.
      Use the secure code below to continue.
    </p>

    <div style="text-align:center;margin:35px 0;">
      <div style="
        display:inline-block;
        padding:18px 30px;
        background:${PRIMARY_COLOR};
        color:#ffffff;
        font-size:26px;
        font-weight:700;
        letter-spacing:4px;
        border-radius:8px;
      ">
        ${values.otp}
      </div>
    </div>

    <p>
      This code will expire in <strong>3 minutes</strong>.
    </p>

    <p style="color:#888;font-size:13px;">
      If you did not request a password reset, you can safely ignore this email.
    </p>
  `;

  return {
    to: values.email,
    subject: "GoGreenMatrix – Password Reset Code",
    html: baseLayout(content),
  };
};

export const emailTemplate = {
  createAccount,
  resetPassword,
};
