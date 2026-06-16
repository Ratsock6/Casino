import axiosInstance from '../utils/axios.instance';

export interface RafflePrize {
  id: string;
  type: 'CHIPS' | 'VIP' | 'CUSTOM';
  label: string;
  value: string | null;
  rank: number;
  quantity: number;
}

export interface RaffleDraw {
  id: string;
  label: string | null;
  scheduledAt: string;
  status: 'PENDING' | 'DONE';
  executedAt: string | null;
  prizes: RafflePrize[];
}

export interface RaffleCampaign {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'OPEN' | 'ENDED';
  ticketPrice: string;
  maxTicketsPerUser: number;
  startsAt: string;
  endsAt: string;
  totalTicketsSold: number;
  nextDrawAt: string | null;
  draws: RaffleDraw[];
}

export interface MyRaffleTicket {
  id: string;
  ticketNumber: number;
  status: 'ACTIVE' | 'WON';
  purchasedAt: string;
  claimStatus: 'UNCLAIMED' | 'CLAIMED' | 'EXPIRED' | null;
  claimDeadline: string | null;
  claimedAt: string | null;
  wonPrize: { type: string; label: string; value: string | null } | null;
  wonDraw: { id: string; label: string | null; scheduledAt: string } | null;
}

export interface MyTicketsResponse {
  campaign: { id: string; name: string; maxTicketsPerUser: number } | null;
  totalOwned: number;
  tickets: MyRaffleTicket[];
}

export interface BuyTicketsResponse {
  campaignId: string;
  campaignName: string;
  quantity: number;
  ticketNumbers: number[];
  totalCost: string;
  balanceBefore: string;
  balanceAfter: string;
  totalOwned: number;
  maxTicketsPerUser: number;
}

export const getCurrentRaffleApi = async (): Promise<RaffleCampaign | null> => {
  const res = await axiosInstance.get('/raffle/current');
  return res.data;
};

export const getMyRaffleTicketsApi = async (): Promise<MyTicketsResponse> => {
  const res = await axiosInstance.get('/raffle/my-tickets');
  return res.data;
};

export const buyRaffleTicketsApi = async (
  quantity: number,
  idempotencyKey: string,
): Promise<BuyTicketsResponse> => {
  const res = await axiosInstance.post<BuyTicketsResponse>(
    '/raffle/buy',
    { quantity },
    { headers: { 'x-idempotency-key': idempotencyKey } },
  );
  return res.data;
};
