import { USER_ROLES } from "../../../enums/user";
import { LOTTERY_STATUS } from "../lottery/lottery.constant";
import { Lottery } from "../lottery/lottery.model";
import { LOTTERY_PARTICIPANT_STATUS } from "../participant/participant.constant";
import { LotteryParticipant } from "../participant/participant.model";
import { User } from "../user/user.model";

const getFinanceAndPaymentsStatsFromDB = async (query: any) => {
  const filterType = query?.filter || "all";

  let dateFilter = {};

  const now = new Date();

  /* ================= ONLY APPLY FILTER IF NOT "all" ================= */
  if (filterType === "thisWeek") {
    dateFilter = {
      createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) },
    };
  }

  if (filterType === "thisMonth") {
    dateFilter = {
      createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) },
    };
  }

  if (filterType === "thisYear") {
    dateFilter = {
      createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) },
    };
  }

  /* ================= ALL DATA BY DEFAULT ================= */
  const allParticipations = await LotteryParticipant.find(dateFilter);

  if (!allParticipations.length) {
    return {
      filter: "all",
      totalRevenue: 0,
      totalParticipations: 0,
      averageTicketPrice: 0,
    };
  }

  const totalParticipations = allParticipations.length;

  const approvedParticipants = allParticipations.filter(
    (p) => p.status === LOTTERY_PARTICIPANT_STATUS.APPROVED
  );

  const totalRevenue = approvedParticipants.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const totalTicketsValue = allParticipations.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const averageTicketPrice =
    totalParticipations > 0
      ? totalTicketsValue / totalParticipations
      : 0;

  return {
    filter: filterType,
    totalRevenue,
    totalParticipations,
    averageTicketPrice,
  };
};

const getAdminDashboardStatsFromDB = async () => {
  const [
    totalUsers,
    totalDrawCompleted,
    pendingPayments,
    ticketStats,
  ] = await Promise.all([
  //  total users
    User.countDocuments({
      role: USER_ROLES.USER,
      verified: true,
    }),

    //  total draw completed
    Lottery.countDocuments({
      status: LOTTERY_STATUS.DRAWN,
    }),

    //  total pending payments
    LotteryParticipant.countDocuments({
      status: LOTTERY_PARTICIPANT_STATUS.PENDING,
    }),

    //  total tickets sold + total revenue
    LotteryParticipant.aggregate([
      {
        $match: {
          status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
        },
      },
      {
        $lookup: {
          from: "lotteries",
          localField: "lotteryId",
          foreignField: "_id",
          as: "lottery",
        },
      },
      { $unwind: "$lottery" },

      {
        $group: {
          _id: null,
          totalTicketsSold: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $ifNull: ["$amount", "$lottery.ticketPrice"],
            },
          },
        },
      },
    ]),
  ]);

  const totalTicketsSold = ticketStats[0]?.totalTicketsSold || 0;
  const totalRevenue = ticketStats[0]?.totalRevenue || 0;

  return {
    stats: {
      totalUsers,
      totalDrawCompleted,
      pendingPayments,
      totalTicketsSold,
      totalRevenue,
    },
  };
};

const getYearlyTicketStatsFromDB = async (year?: number) => {
  const targetYear = year || new Date().getFullYear();

  const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);

  const stats = await LotteryParticipant.aggregate([
    {
      $match: {
        status: LOTTERY_PARTICIPANT_STATUS.APPROVED,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },

    {
      $group: {
        _id: { $month: "$createdAt" },

        totalTickets: { $sum: 1 },

        users: { $addToSet: "$userId" },
      },
    },

    {
      $project: {
        month: "$_id",
        totalTickets: 1,
        totalUsers: { $size: "$users" },
        _id: 0,
      },
    },
  ]);

  const monthsMap: Record<number, any> = {};

  stats.forEach((item) => {
    monthsMap[item.month] = item;
  });

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const formattedData = monthNames.map((name, index) => {
    const monthIndex = index + 1;

    return {
      month: name,
      totalTickets: monthsMap[monthIndex]?.totalTickets || 0,
      totalUsers: monthsMap[monthIndex]?.totalUsers || 0,
    };
  });

  return {
    year: targetYear,
    data: formattedData,
  };
};

export const AnalyticsServices = {
    getFinanceAndPaymentsStatsFromDB,
    getAdminDashboardStatsFromDB,
    getYearlyTicketStatsFromDB,
}