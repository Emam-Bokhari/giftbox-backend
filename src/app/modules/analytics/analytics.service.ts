import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryParticipant } from "../participant/participant.model";

const getFinanceAndPaymentsStatsFromDB = async () => {

    const allParticipations = await LotteryParticipant.find();

    if (!allParticipations.length) {
        return {
            totalRevenue: 0,
            totalParticipations: 0,
            averageTicketPrice: 0,
        };
    }

    // total participations
    const totalParticipations = allParticipations.length;

    // approved participants
    const approvedParticipants = allParticipations.filter(
        (p) => p.status === LOTTERY_PARTICIPANT_STATUS.APPROVED
    );

    // total revenue
    const totalRevenue = approvedParticipants.reduce((sum, p) => {
        return sum + (p.amount || 0);
    }, 0);

    // total tickets value
    const totalTicketsValue = allParticipations.reduce((sum, p) => {
        return sum + (p.amount || 0);
    }, 0);

    const averageTicketPrice =
        totalParticipations > 0
            ? totalTicketsValue / totalParticipations
            : 0;

    return {
        totalRevenue,
        totalParticipations,
        averageTicketPrice,
    };
};

export const AnalyticsServices = {
    getFinanceAndPaymentsStatsFromDB,
}