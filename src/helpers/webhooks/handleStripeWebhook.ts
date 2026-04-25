import { BOOKING_STATUS } from "../../app/modules/booking/booking.interface";
import { Booking } from "../../app/modules/booking/booking.model";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from "../../app/modules/transaction/transaction.interface";
import { Transaction } from "../../app/modules/transaction/transaction.model";
import { User } from "../../app/modules/user/user.model";
import stripe from "../../config/stripe";
import { sendNotifications } from "../notificationsHelper";
import { NOTIFICATION_TYPE } from "../../app/modules/notification/notification.constant";
import { USER_ROLES } from "../../enums/user";

/** -------------------------- STRIPE WEBHOOK HELPERS -------------------------- */

/** Handle checkout.session.completed → confirm booking */
export const handleCheckoutSessionCompleted = async (session: any) => {
  const transaction = await Transaction.findById(
    session.metadata.transactionId,
  );
  if (!transaction) return;

  // Update transaction
  transaction.status = TRANSACTION_STATUS.SUCCESS;
  transaction.stripePaymentIntentId = session.payment_intent;
  await transaction.save();

  // Atomic booking update
  const booking = await Booking.findOneAndUpdate(
    { _id: transaction.bookingId, bookingStatus: BOOKING_STATUS.PENDING },
    {
      bookingStatus: BOOKING_STATUS.CONFIRMED,
      transactionId: transaction._id,
      isPaid: true,
      paidAt: new Date(),
      confirmedAt: new Date(),
    },
    { new: true },
  );

  if (booking) console.log(`✅ Booking ${booking._id} confirmed`);
  else
    console.log(
      `⚠ Booking ${transaction.bookingId} already confirmed or invalid state`,
    );

  // Send notification to the user, host, and admin
  if (booking) {
    await sendNotifications({
      title: "Booking Confirmed",
      text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
      receiver: booking.userId.toString(),
      type: NOTIFICATION_TYPE.USER,
      referenceId: booking._id.toString(),
      referenceModel: "Booking",
    });

    await sendNotifications({
      title: "Booking Confirmed",
      text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
      receiver: booking.hostId.toString(),
      type: NOTIFICATION_TYPE.HOST,
      referenceId: booking._id.toString(),
      referenceModel: "Booking",
    });

    const admin = await User.findOne({
      role: USER_ROLES.SUPER_ADMIN,
    }).select("_id");
    if (admin) {
      await sendNotifications({
        title: "Booking Confirmed",
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: admin._id.toString(),
        type: NOTIFICATION_TYPE.ADMIN,
        referenceId: booking._id.toString(),
        referenceModel: "Booking",
      });
    }
  }
};

// Handle extend booking success [PREVIOUS CODE]
// export const handleExtendBookingSuccess = async (session: any) => {
//   const transactionId = session.metadata?.transactionId;
//   if (!transactionId) return;

//   const transaction = await Transaction.findById(transactionId);
//   if (!transaction) return;

//   // 🔒 Prevent double execution
//   if (transaction.status === TRANSACTION_STATUS.SUCCESS) {
//     console.log("Extend already processed");
//     return;
//   }

//   // Only EXTEND type allowed
//   if (transaction.type !== TRANSACTION_TYPE.EXTEND) return;

//   const booking = await Booking.findById(transaction.bookingId);
//   if (!booking) return;

//   // Booking must be active
//   if (
//     ![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING].includes(
//       booking.bookingStatus,
//     )
//   ) {
//     console.log("Booking not in extendable state");
//     return;
//   }

//   // Get newToDate (recommended from DB, not metadata)
//   const newToDate = transaction.extendToDate; //  safer

//   if (!newToDate) {
//     console.error("No extendToDate found in transaction");
//     return;
//   }

//   if (newToDate <= booking.toDate) {
//     console.log("Invalid extend date");
//     return;
//   }

//   //  Update transaction
//   transaction.status = TRANSACTION_STATUS.SUCCESS;
//   transaction.stripePaymentIntentId = session.payment_intent;
//   await transaction.save();

//   // Update booking time and amounts
//   const oldToDate = booking.toDate;
//   booking.toDate = newToDate;

//   // Update cumulative totals in booking
//   const extensionPlatformFee = transaction.charges?.platformFee || 0;
//   const extensionHostCommission = transaction.charges?.hostCommission || 0;
//   const extensionAdminCommission = transaction.charges?.adminCommission || 0;
//   const extensionRentalPrice = transaction.amount - extensionPlatformFee;

//   (booking as any).rentalPrice =
//     ((booking as any).rentalPrice || 0) + extensionRentalPrice;
//   (booking as any).platformFee =
//     ((booking as any).platformFee || 0) + extensionPlatformFee;
//   (booking as any).hostCommission =
//     ((booking as any).hostCommission || 0) + extensionHostCommission;
//   (booking as any).adminCommission =
//     ((booking as any).adminCommission || 0) + extensionAdminCommission;
//   booking.totalAmount = (booking.totalAmount || 0) + transaction.amount;
//   // booking.extendedHours =
//   //   (booking.extendedHours || 0) + (transaction.extendedHours || 0);

//   // Optional: store extend history
//   booking.extendHistory = [
//     ...(booking.extendHistory || []),
//     {
//       previousToDate: oldToDate,
//       newToDate,
//       transactionId: transaction._id,
//       extendedAt: new Date(),
//     },
//   ];

//   await booking.save();

//   console.log(` Booking ${booking._id} extended to ${newToDate}`);
// };

// [NEW CODE]
// Handle extend booking success
export const handleExtendBookingSuccess = async (session: any) => {
  const transactionId = session.metadata?.transactionId;
  if (!transactionId) return;

  // 🔒 Atomic update to prevent double execution
  const transaction = await Transaction.findOneAndUpdate(
    {
      _id: transactionId,
      status: TRANSACTION_STATUS.INITIATED,
    },
    {
      status: TRANSACTION_STATUS.SUCCESS,
      stripePaymentIntentId: session.payment_intent,
    },
    { new: true },
  );

  if (!transaction) {
    console.log("Transaction already processed or not found");
    return;
  }

  // Only EXTEND allowed
  if (transaction.type !== TRANSACTION_TYPE.EXTEND) return;

  const booking = await Booking.findById(transaction.bookingId);
  if (!booking) return;

  // Booking must be active
  if (
    ![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING].includes(
      booking.bookingStatus,
    )
  ) {
    console.log("Booking not in extendable state");
    return;
  }

  const newToDate = transaction.extendToDate;
  if (!newToDate) {
    console.error("No extendToDate found in transaction");
    return;
  }

  if (newToDate <= booking.toDate) {
    console.log("Invalid extend date");
    return;
  }

  // ---------------------------
  // 🔄 Update booking timeline
  // ---------------------------
  const oldToDate = booking.toDate;
  booking.toDate = newToDate;

  // ---------------------------
  // 💰 Revenue aggregation
  // ---------------------------
  const extensionPlatformFee = transaction.charges?.platformFee || 0;
  const extensionHostCommission = transaction.charges?.hostCommission || 0;
  const extensionAdminCommission = transaction.charges?.adminCommission || 0;

  // IMPORTANT: safer than derived amount
  const extensionBasePrice =
    transaction.amount - extensionPlatformFee;

  booking.rentalPrice =
    (booking.rentalPrice || 0) + extensionBasePrice;

  booking.platformFee =
    (booking.platformFee || 0) + extensionPlatformFee;

  booking.hostCommission =
    (booking.hostCommission || 0) + extensionHostCommission;

  booking.adminCommission =
    (booking.adminCommission || 0) + extensionAdminCommission;

  booking.totalAmount =
    (booking.totalAmount || 0) + transaction.amount;

  // ---------------------------
  // ⏱ Extended Hours fix
  // ---------------------------
  booking.extendedHours =
    (booking.extendedHours || 0) +
    (transaction.extendedHours || 0);

  // ---------------------------
  // 📜 Extend history log
  // ---------------------------
  booking.extendHistory = [
    ...(booking.extendHistory || []),
    {
      previousToDate: oldToDate,
      newToDate,
      transactionId: transaction._id,
      extendedAt: new Date(),
    },
  ];

  await booking.save();

  console.log(`✅ Booking ${booking._id} extended to ${newToDate}`);
};

/** Handle host account.updated → mark onboarded */
const handleAccountUpdated = async (account: any) => {
  console.log("Webhook received: account.updated");

  if (
    account.charges_enabled &&
    account.requirements?.currently_due?.length === 0
  ) {
    console.log("Account ready for onboarding:", account.id, "update start");

    const host = await User.findOneAndUpdate(
      { stripeConnectedAccountId: account.id },
      { isStripeOnboarded: true },
      { new: true },
    );
    console.log("Host:", host, "update isStripeOnboarded to true");
    if (host) console.log(`✅ Host onboarded: ${host._id}`);
    else console.log("No host found to update or already onboarded");
  } else {
    console.log("Account not ready for onboarding:", {
      charges_enabled: account.charges_enabled,
      currently_due: account.requirements?.currently_due,
    });
  }
};

/** Main Stripe webhook handler */
export const handleStripeWebhook = async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const transaction = await Transaction.findById(
          session.metadata.transactionId,
        );
        if (!transaction) break;

        if (transaction.type === TRANSACTION_TYPE.EXTEND) {
          await handleExtendBookingSuccess(session);
        } else {
          await handleCheckoutSessionCompleted(session);
        }
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      default:
        console.log("Unhandled Stripe event type:", event.type);
    }
  } catch (err) {
    console.error("Error processing Stripe webhook:", err);
  }

  res.json({ received: true });
};

/** -------------------------- BOOKING STATUS HELPERS -------------------------- */

/** Move booking → ONGOING (Self / Confirmed) */
export const markBookingOngoing = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return;

  const now = new Date();
  if (
    (booking.bookingStatus === BOOKING_STATUS.CONFIRMED ||
      booking.isSelfBooking) &&
    booking.fromDate <= now &&
    booking.toDate > now &&
    !booking.isCanceledByUser &&
    !booking.isCanceledByHost
  ) {
    booking.bookingStatus = BOOKING_STATUS.ONGOING;
    booking.checkedInAt = now;
    booking.ongoingAt = now;
    await booking.save();
    console.log(`Booking ${booking._id} marked as ONGOING`);

    // send notification status user, host and admin
    await sendNotifications({
      title: "Booking Ongoing",
      text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
      receiver: booking.userId.toString(),
      type: NOTIFICATION_TYPE.USER,
      referenceId: booking._id.toString(),
    });

    await sendNotifications({
      title: "Booking Ongoing",
      text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
      receiver: booking.hostId.toString(),
      type: NOTIFICATION_TYPE.HOST,
      referenceId: booking._id.toString(),
    });

    const admin = await User.findOne({
      role: USER_ROLES.SUPER_ADMIN,
    }).select("_id");
    if (admin) {
      await sendNotifications({
        title: "Booking Ongoing",
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: admin._id.toString(),
        type: NOTIFICATION_TYPE.ADMIN,
        referenceId: booking._id.toString(),
      });
    }
  }
};

/** Move booking → COMPLETED + schedule deposit refund + host commission payout */
export const markBookingCompleted = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId)
    .populate("carId")
    .populate("transactionId")
    .populate("hostId");
  if (!booking) return;

  const now = new Date();
  if (
    booking.bookingStatus === BOOKING_STATUS.ONGOING &&
    booking.toDate <= now
  ) {
    booking.bookingStatus = BOOKING_STATUS.COMPLETED;
    booking.checkedOutAt = now;
    booking.completedAt = now;

    // Schedule deposit refund 3 days later
    booking.depositRefundableAt = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    );
    booking.isDepositRefunded = false;

    await booking.save();
    console.log(
      `Booking ${booking._id} marked COMPLETED, deposit refund scheduled`,
    );

    // ------------------ HOST COMMISSION (MANUAL PAYMENT) ------------------
    // Previously, we transferred host commission automatically via Stripe.
    // Now, all funds stay in the admin account, and the host is paid manually.
    // The calculation remains in the booking record for reference.
    const totalHostCommission = (booking as any).hostCommission || 0;
    console.log(
      `ℹ Host commission for booking ${booking._id}: ${totalHostCommission} (To be paid manually)`,
    );
  }
};

/** Refund deposit if eligible (3 days after completion) */
export const refundDepositIfEligible = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId)
    .populate("carId")
    .populate("transactionId");
  if (!booking) return;

  const now = new Date();
  const car = booking.carId as any;
  const transaction = booking.transactionId as any;

  if (!car || !car.depositAmount || booking.isDepositRefunded) return;
  if (!transaction || !transaction.stripePaymentIntentId) return;
  if (!booking.depositRefundableAt || booking.depositRefundableAt > now) return;

  try {
    await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId as string,
      amount: Math.round(car.depositAmount * 100), // Stripe expects cents
    });

    booking.isDepositRefunded = true;
    await booking.save();

    console.log(`Deposit refunded for booking ${booking._id}`);
  } catch (err: any) {
    console.error(
      `Failed to refund deposit for booking ${booking._id}:`,
      err.message,
    );
  }
};

/** -------------------------- CRON JOB / SCHEDULED TASK -------------------------- */
export const bookingStatusCronJob = async () => {
  const now = new Date();

  //  Self booking REQUESTED → ONGOING
  const requestedBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.REQUESTED,
    isSelfBooking: true,
    fromDate: { $lte: now },
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  for (const booking of requestedBookings) {
    try {
      await markBookingOngoing(booking._id.toString());
    } catch (err: any) {
      console.warn(
        `Cannot move self booking ${booking._id} to ONGOING:`,
        err.message,
      );
    }
  }

  //  CONFIRMED → ONGOING
  const confirmedBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.CONFIRMED,
    fromDate: { $lte: now },
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  for (const booking of confirmedBookings) {
    try {
      await markBookingOngoing(booking._id.toString());
    } catch (err: any) {
      console.warn(
        `Cannot move booking ${booking._id} to ONGOING:`,
        err.message,
      );
    }
  }

  // ONGOING → COMPLETED + schedule deposit
  const ongoingBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.ONGOING,
    toDate: { $lte: now },
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  for (const booking of ongoingBookings) {
    try {
      await markBookingCompleted(booking._id.toString());
    } catch (err: any) {
      console.warn(
        `Cannot move booking ${booking._id} to COMPLETED:`,
        err.message,
      );
    }
  }

  //  Deposit refund eligible
  const refundableBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.COMPLETED,
    depositRefundableAt: { $lte: now },
    isDepositRefunded: { $ne: true },
  });

  for (const booking of refundableBookings) {
    try {
      await refundDepositIfEligible(booking._id.toString());
    } catch (err: any) {
      console.warn(
        `Failed to refund deposit for booking ${booking._id}:`,
        err.message,
      );
    }
  }

  //  Mark REQUESTED and PENDING bookings as EXPIRED if fromDate <= now
  const expiredBookings = await Booking.find({
    bookingStatus: { $in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.PENDING] },
    fromDate: { $lte: now },
  });

  if (expiredBookings.length > 0) {
    console.log(`Found ${expiredBookings.length} expired bookings to process.`);
  }

  for (const booking of expiredBookings) {
    try {
      booking.bookingStatus = BOOKING_STATUS.EXPIRED;
      await booking.save();
      console.log(`Booking ${booking._id} marked as EXPIRED`);

      // send notification status user, host and admin
      await sendNotifications({
        title: "Booking Expired",
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: booking.userId.toString(),
        type: NOTIFICATION_TYPE.USER,
        referenceId: booking._id.toString(),
      });

      await sendNotifications({
        title: "Booking Expired",
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: booking.hostId.toString(),
        type: NOTIFICATION_TYPE.HOST,
        referenceId: booking._id.toString(),
      });

      const admin = await User.findOne({
        role: USER_ROLES.SUPER_ADMIN,
      }).select("_id");
      if (admin) {
        await sendNotifications({
          title: "Booking Expired",
          text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
          receiver: admin._id.toString(),
          type: NOTIFICATION_TYPE.ADMIN,
          referenceId: booking._id.toString(),
        });
      }
    } catch (err: any) {
      console.warn(
        `Failed to mark booking ${booking._id} as EXPIRED:`,
        err.message,
      );
    }
  }
};
