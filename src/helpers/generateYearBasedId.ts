import { User } from "../app/modules/user/user.model";
import { USER_ROLES } from "../enums/user";
import { Car } from "../app/modules/car/car.model";
import { Booking } from "../app/modules/booking/booking.model";

// Find the last created host's membershipId
const findLastMembershipId = async () => {
  const lastHost = await User.findOne(
    { role: USER_ROLES.HOST }, // host role
    { membershipId: 1, _id: 0 },
  )
    .sort({ createdAt: -1 })
    .lean();

  return lastHost?.membershipId || null;
};

// Generate new membership ID
// Format: MEM-2026-0001
export const generateMembershipId = async () => {
  const currentYear = new Date().getUTCFullYear().toString();

  let currentId = (0).toString().padStart(4, "0"); // default 0000

  const lastMembershipId = await findLastMembershipId();

  if (lastMembershipId) {
    // lastMembershipId = "MEM-2026-0001"
    const lastYear = lastMembershipId.split("-")[1]; // 2026
    const lastNumber = lastMembershipId.split("-")[2]; // 0001

    if (lastYear === currentYear) {
      currentId = (parseInt(lastNumber) + 1).toString().padStart(4, "0");
    }
  }

  return `MEM-${currentYear}-${currentId}`;
};

// Find the last created car's vehicleId
const findLastVehicleId = async () => {
  const lastCar = await Car.findOne(
    {}, // all cars
    { vehicleId: 1, _id: 0 },
  )
    .sort({ createdAt: -1 })
    .lean();

  return lastCar?.vehicleId || null;
};

// Generate new vehicle ID
// Format: VEH-2026-0001
export const generateVehicleId = async () => {
  const currentYear = new Date().getUTCFullYear().toString();

  let currentId = (0).toString().padStart(4, "0"); // default 0000

  const lastVehicleId = await findLastVehicleId();

  if (lastVehicleId) {
    // lastVehicleId = "VEH-2026-0001"
    const lastYear = lastVehicleId.split("-")[1]; // 2026
    const lastNumber = lastVehicleId.split("-")[2]; // 0001

    if (lastYear === currentYear) {
      currentId = (parseInt(lastNumber) + 1).toString().padStart(4, "0");
    }
  }

  return `VEH-${currentYear}-${currentId}`;
};

// Find the last created booking's bookingId
const findLastBookingId = async () => {
  const lastBooking = await Booking.findOne({}, { bookingId: 1, _id: 0 })
    .sort({ createdAt: -1 })
    .lean();

  return lastBooking?.bookingId || null;
};

// Generate new booking ID
// Format: BKG-2026-0001
export const generateBookingId = async () => {
  const currentYear = new Date().getUTCFullYear().toString();

  let currentId = "0000"; // default

  const lastBookingId = await findLastBookingId();

  if (lastBookingId) {
    // lastBookingId = "BKG-2026-0001"
    const [, lastYear, lastNumber] = lastBookingId.split("-");

    if (lastYear === currentYear) {
      currentId = (Number(lastNumber) + 1).toString().padStart(4, "0");
    }
  }

  return `BKG-${currentYear}-${currentId}`;
};
