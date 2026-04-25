import ApiError from "../../../errors/ApiErrors";
import { TSettings } from "./settings.interface";
import { Settings } from "./settings.model";

const createOrUpdateSettingsToDB = async (payload: TSettings) => {
  const { paymentNumbers, currency } = payload;

  // basic validation
  if (!paymentNumbers || paymentNumbers.length === 0) {
    throw new ApiError(400, "At least one payment number is required");
  }

  if (!currency) {
    throw new ApiError(400, "Currency is required");
  }

  const existingSettings = await Settings.findOne();

  let result;

  if (existingSettings) {
    // SAFE MONGOOSE UPDATE (fix for DocumentArray issue)
    result = await Settings.findByIdAndUpdate(
      existingSettings._id,
      {
        $set: {
          paymentNumbers,
          currency,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
  } else {
    result = await Settings.create({
      paymentNumbers,
      currency,
    });
  }

  return result;
};

export const SettingsServices={
    createOrUpdateSettingsToDB,
}
