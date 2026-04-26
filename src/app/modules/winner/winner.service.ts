import ApiError from "../../../errors/ApiErrors";
import { randomInt } from "crypto";
import { WINNER_SELECTED_BY } from "./winner.constant";
import { Lottery } from "../lottery/lottery.model";
import { LotteryParticipant } from "../participant/participant.model";
import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryWinner } from "./winner.model";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";

// secure shuffle

const secureShuffle = (array: any[]) => {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
        const rand = randomInt(0, i + 1);
        [arr[i], arr[rand]] = [arr[rand], arr[i]];
    }

    return arr;
};

// random pick
const drawRandomWinners = (participants: any[], winnerCount: number) => {
    if (winnerCount > participants.length) {
        throw new ApiError(400, "Winner count exceeds participants");
    }

    const shuffled = secureShuffle(participants);
    return shuffled.slice(0, winnerCount);
};

// main service
const drawLotteryWinnersIntoDB = async (payload: {
    lotteryId: string;
    mode: WINNER_SELECTED_BY;
    winnerCount: number;
    selectedUserIds?: string[];
}) => {
    const { lotteryId, mode, winnerCount, selectedUserIds } = payload;

    if (!lotteryId) {
        throw new ApiError(400, "Lottery ID is required");
    }

    const lottery = await Lottery.findById(lotteryId);

    if (!lottery) {
        throw new ApiError(404, "Lottery not found");
    }

    // get approved participants
    const approvedParticipants = await LotteryParticipant.find({
        lotteryId,
        status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
    });

    if (!approvedParticipants.length) {
        throw new ApiError(400, "No approved participants found");
    }

    let winners: any[] = [];

    // random mode
    // if (mode === WINNER_SELECTED_BY.RANDOM) {
    //     winners = drawRandomWinners(approvedParticipants, winnerCount);
    // }
    if (mode === WINNER_SELECTED_BY.RANDOM) {
        const shuffled = secureShuffle(approvedParticipants);

        winners = shuffled.slice(0, winnerCount).map((w, index) => ({
            ...w,
            rank: index + 1,
        }));
    }

    // manual mode
    // if (mode === WINNER_SELECTED_BY.MANUAL) {
    //     if (!selectedUserIds || selectedUserIds.length === 0) {
    //         throw new ApiError(
    //             400,
    //             "Selected users required for manual mode"
    //         );
    //     }

    //     winners = approvedParticipants.filter((p) =>
    //         selectedUserIds.includes(p.userId.toString())
    //     );

    //     if (!winners.length) {
    //         throw new ApiError(400, "No valid winners selected");
    //     }
    // }
    if (mode === WINNER_SELECTED_BY.MANUAL) {
        if (!selectedUserIds || selectedUserIds.length === 0) {
            throw new ApiError(400, "Selected users required for manual mode");
        }

        winners = approvedParticipants
            .filter((p) => selectedUserIds.includes(p.userId.toString()))
            .map((w, index) => ({
                ...w,
                rank: index + 1,
            }));

        if (!winners.length) {
            throw new ApiError(400, "No valid winners selected");
        }
    }

    // save winners
    const winnerDocs = await Promise.all(
        winners.map((w) =>
            LotteryWinner.create({
                lotteryId,
                userId: w.userId,
                selectedBy: mode,
            })
        )
    );

    // finalize lottery
    lottery.status = LOTTERY_STATUS.DRAWN;
    await lottery.save();

    return {
        lotteryId,
        mode,
        totalWinners: winnerDocs.length,
        winners: winnerDocs,
    };
};

export const WinnerServices = {
    drawLotteryWinnersIntoDB,
}