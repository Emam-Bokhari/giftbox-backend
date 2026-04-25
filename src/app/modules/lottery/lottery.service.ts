import ApiError from "../../../errors/ApiErrors";
import { generateTicketId } from "../../../helpers/generateCustomId";
import QueryBuilder from "../../builder/queryBuilder";
import { LOTTERY_MODE, LOTTERY_STATUS } from "./lottery.constant";
import { TLottery } from "./lottery.interface";
import { Lottery } from "./lottery.model";

const createLotteryToDB = async (payload: TLottery) => {
    const {
        title,
        description,
        banner,
        ticketPrice,
        currency,
        mode,
        startAt,
        endAt,
    } = payload;


    if (!title || !ticketPrice || !currency || !mode || !endAt) {
        throw new ApiError(400, "Missing required fields");
    }

    const endTime = new Date(endAt);
    if (isNaN(endTime.getTime())) {
        throw new ApiError(400, "Invalid end date");
    }

    // generate ticket number
    const ticketNumber = await generateTicketId();
    payload.ticketNumber = ticketNumber;

    // only ONE ACTIVE lottery allowed

    if (mode === LOTTERY_MODE.INSTANT) {
        const activeExists = await Lottery.exists({
            status: LOTTERY_STATUS.ACTIVE,
        });

        if (activeExists) {
            throw new ApiError(
                400,
                "Another active lottery already exists. Please end it first."
            );
        }
    }


    // determine status safely

    let status: LOTTERY_STATUS;
    let startTime: Date | undefined;

    switch (mode) {
        case LOTTERY_MODE.INSTANT: {
            status = LOTTERY_STATUS.ACTIVE;
            startTime = new Date();
            break;
        }

        case LOTTERY_MODE.SCHEDULE: {
            if (!startAt) {
                throw new ApiError(
                    400,
                    "Start time is required for schedule mode"
                );
            }

            const parsedStart = new Date(startAt);
            if (isNaN(parsedStart.getTime())) {
                throw new ApiError(400, "Invalid start date");
            }

            if (parsedStart >= endTime) {
                throw new ApiError(
                    400,
                    "Start time must be before end time"
                );
            }

            status = LOTTERY_STATUS.SCHEDULED;
            startTime = parsedStart;
            break;
        }

        case LOTTERY_MODE.DRAFT: {
            status = LOTTERY_STATUS.DRAFT;
            break;
        }

        default:
            throw new ApiError(400, "Invalid lottery mode");
    }


    const lottery = await Lottery.create({
        ticketNumber,
        title,
        description,
        banner,
        ticketPrice,
        currency,
        mode,
        status,
        startAt: startTime,
        endAt: endTime,
    });

    return lottery;
};

const getActiveLotteryFromDB = async () => {
    const activeLottery = await Lottery.findOne({
        status: LOTTERY_STATUS.ACTIVE,
    });

    if (!activeLottery) {
        throw new ApiError(404, "No active lottery found");
    }

    return activeLottery;
};

const getLotteryByIdFromDB = async (id: string) => {
    const lottery = await Lottery.findById(id);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    return lottery;
};

const getAllLotteriesFromDB = async (query: Record<string, unknown>) => {
    const lotteryQuery = new QueryBuilder(
        Lottery.find(),
        query
    )
        .search(["title", "description", "ticketNumber"])
        .filter()
        .sort()
        .paginate()
        .fields();

    const data = await lotteryQuery.modelQuery;
    const meta = await lotteryQuery.countTotal();

    return {
        meta,
        data,
    };
};

const getSingleLotteryFromDB = async (id: string) => {
    if (!id) {
        throw new ApiError(400, "Lottery ID is required");
    }

    const lottery = await Lottery.findById(id);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    return lottery;
};

const updateLotteryIntoDB = async (
    id: string,
    payload: any
) => {
    if (!id) {
        throw new ApiError(400, "Lottery ID is required");
    }

    const lottery = await Lottery.findById(id);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    // ❌ DRAWN = fully locked
    if (lottery.status === LOTTERY_STATUS.DRAWN) {
        throw new ApiError(400, "Cannot update a drawn lottery");
    }

    // 🔵 ACTIVE = strict lock
    if (lottery.status === LOTTERY_STATUS.ACTIVE) {
        const restrictedFields = [
            "ticketPrice",
            "currency",
            "mode",
            "startAt",
            "endAt",
            "status",
        ];

        restrictedFields.forEach((field) => {
            if (payload[field] !== undefined) {
                throw new ApiError(
                    400,
                    `Cannot update ${field} of an active lottery`
                );
            }
        });
    }

    // 🟡 SCHEDULED = partial restriction (IMPORTANT FIX)
    if (lottery.status === LOTTERY_STATUS.SCHEDULED) {
        const restrictedFields = [
            "startAt",
            "mode",
            "status",
        ];

        restrictedFields.forEach((field) => {
            if (payload[field] !== undefined) {
                throw new ApiError(
                    400,
                    `Cannot update ${field} of a scheduled lottery`
                );
            }
        });
    }

    // 🧪 date validation (safe for DRAFT or allowed cases)
    if (payload.startAt && payload.endAt) {
        const start = new Date(payload.startAt);
        const end = new Date(payload.endAt);

        if (start >= end) {
            throw new ApiError(
                400,
                "Start time must be before end time"
            );
        }
    }

    // 🚀 final update
    const updatedLottery = await Lottery.findByIdAndUpdate(
        id,
        { $set: payload },
        {
            new: true,
            runValidators: true,
        }
    );

    return updatedLottery;
};

const updateLotteryStatusIntoDB = async (
    id: string,
    status: LOTTERY_STATUS
) => {
    if (!id) {
        throw new ApiError(400, "Lottery ID is required");
    }

    if (!status) {
        throw new ApiError(400, "Status is required");
    }

    const lottery = await Lottery.findById(id);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    // If already DRAWN → no further change allowed
    if (lottery.status === LOTTERY_STATUS.DRAWN) {
        throw new ApiError(
            400,
            "Cannot change status of a drawn lottery"
        );
    }

    //  Prevent invalid transitions
    const invalidTransitions = [
        `${LOTTERY_STATUS.DRAWN}->${LOTTERY_STATUS.ACTIVE}`,
        `${LOTTERY_STATUS.DRAWN}->${LOTTERY_STATUS.SCHEDULED}`,
        `${LOTTERY_STATUS.ENDED}->${LOTTERY_STATUS.ACTIVE}`,
    ];

    const transition = `${lottery.status}->${status}`;

    if (invalidTransitions.includes(transition)) {
        throw new ApiError(
            400,
            `Invalid status transition from ${lottery.status} to ${status}`
        );
    }

    //  Update status
    lottery.status = status;
    await lottery.save();

    return lottery;
};

const deleteLotteryFromDB = async (id: string) => {
    if (!id) {
        throw new ApiError(400, "Lottery ID is required");
    }

    const lottery = await Lottery.findById(id);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    //  Safety rule (recommended)
    if (
        lottery.status === LOTTERY_STATUS.ACTIVE ||
        lottery.status === LOTTERY_STATUS.SCHEDULED
    ) {
        throw new ApiError(
            400,
            "Active or scheduled lottery cannot be deleted"
        );
    }

    const data = await Lottery.findByIdAndDelete(id);

    return data;
};

export const LotteryServices = {
    createLotteryToDB,
    getActiveLotteryFromDB,
    getLotteryByIdFromDB,
    getAllLotteriesFromDB,
    getSingleLotteryFromDB,
    updateLotteryStatusIntoDB,
    updateLotteryIntoDB,
    deleteLotteryFromDB,
}