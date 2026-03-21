import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BetService } from '../bet/bet.service';
import { GameConfigService } from '../game-config/game-config.service';
import { UserRole } from '../generated/prisma/client';
import {
  BlackjackGameStatus,
  GameType,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BlackjackActionType,
  BlackjackCard,
  CardRank,
  CardSuit,
  JsonObject,
} from './types/blackjack.types';



@Injectable()
export class BlackjackService {
  private readonly suits: CardSuit[] = [
    'HEARTS',
    'DIAMONDS',
    'CLUBS',
    'SPADES',
  ];

  private readonly ranks: CardRank[] = [
    'A',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'J',
    'Q',
    'K',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly betService: BetService,
    private readonly gameConfigService: GameConfigService,
  ) { }


  private getVisibleDealerCards(
    status: BlackjackGameStatus,
    dealerCards: BlackjackCard[],
  ): BlackjackCard[] {
    if (status !== BlackjackGameStatus.PLAYER_TURN) {
      return dealerCards;
    }

    if (dealerCards.length <= 1) {
      return dealerCards;
    }

    return [
      dealerCards[0],
      { rank: 'HIDDEN', suit: 'HIDDEN' },
    ];
  }

  private getVisibleDealerScore(
    status: BlackjackGameStatus,
    dealerCards: BlackjackCard[],
    realDealerScore: number,
  ): number | null {
    if (status !== BlackjackGameStatus.PLAYER_TURN) {
      return realDealerScore;
    }

    if (dealerCards.length === 0) {
      return null;
    }

    const visibleCardResult = this.calculateHandValue([dealerCards[0]]);
    return visibleCardResult.score;
  }

  async startGame(userId: string, role: UserRole, betAmount: number) {
    this.gameConfigService.assertBetAmountAllowed('BLACKJACK', role, betAmount);

    const placedBet = await this.betService.placeBet({
      userId,
      gameType: GameType.BLACKJACK,
      amount: betAmount,
      metadata: {
        mode: 'classic',
      },
    });



    const playerCards = [this.drawCard(), this.drawCard()];
    const dealerCards = [this.drawCard(), this.drawCard()];

    const playerResult = this.calculateHandValue(playerCards);
    const dealerResult = this.calculateHandValue(dealerCards);

    const blackjackGame = await this.prisma.blackjackGame.create({
      data: {
        gameRoundId: placedBet.roundId,
        userId,
        betAmount: BigInt(betAmount),
        playerCards: this.toRequiredInputJsonValue(this.cardsToJson(playerCards)),
        dealerCards: this.toRequiredInputJsonValue(this.cardsToJson(dealerCards)),
        playerScore: playerResult.score,
        dealerScore: dealerResult.score,
        playerSoft: playerResult.soft,
        dealerSoft: dealerResult.soft,
        status: BlackjackGameStatus.PLAYER_TURN,
      },
    });

    const playerHasBlackjack =
      playerCards.length === 2 && playerResult.score === 21;
    const dealerHasBlackjack =
      dealerCards.length === 2 && dealerResult.score === 21;

    if (playerHasBlackjack || dealerHasBlackjack) {
      return this.resolveNaturalBlackjack(
        blackjackGame.id,
        placedBet.roundId,
        betAmount,
        playerCards,
        dealerCards,
        playerResult.score,
        dealerResult.score,
      );
    }

    return this.formatGameResponse({
      id: blackjackGame.id,
      status: blackjackGame.status,
      betAmount: blackjackGame.betAmount,
      playerCards,
      dealerCards,
      playerScore: playerResult.score,
      dealerScore: dealerResult.score,
    });
  }

  async playAction(
    userId: string,
    gameId: string,
    action: BlackjackActionType,
  ) {
    const game = await this.prisma.blackjackGame.findUnique({
      where: { id: gameId },
    });

    if (!game || game.userId !== userId) {
      throw new NotFoundException('Blackjack game not found');
    }

    if (game.status !== BlackjackGameStatus.PLAYER_TURN) {
      throw new BadRequestException('Game is not in player turn');
    }

    const playerCards = game.playerCards as unknown as BlackjackCard[];
    const dealerCards = game.dealerCards as unknown as BlackjackCard[];

    if (action === 'HIT') {
      return this.handleHit(game, playerCards, dealerCards);
    }

    if (action === 'STAND') {
      return this.handleStand(game, playerCards, dealerCards);
    }

    throw new BadRequestException('Unsupported blackjack action');
  }

  async getGame(userId: string, gameId: string) {
    const game = await this.prisma.blackjackGame.findUnique({
      where: { id: gameId },
    });

    if (!game || game.userId !== userId) {
      throw new NotFoundException('Blackjack game not found');
    }

    return this.formatGameResponse({
      id: game.id,
      status: game.status,
      betAmount: game.betAmount,
      playerCards: game.playerCards as unknown as BlackjackCard[],
      dealerCards: game.dealerCards as unknown as BlackjackCard[],
      playerScore: game.playerScore,
      dealerScore: game.dealerScore,
    });
  }

  async getActiveGame(userId: string) {
    const game = await this.prisma.blackjackGame.findFirst({
      where: {
        userId,
        status: BlackjackGameStatus.PLAYER_TURN,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!game) return null;

    return this.formatGameResponse({
      id: game.id,
      status: game.status,
      betAmount: game.betAmount,
      playerCards: game.playerCards as unknown as BlackjackCard[],
      dealerCards: game.dealerCards as unknown as BlackjackCard[],
      playerScore: game.playerScore,
      dealerScore: game.dealerScore,
    });
  }

  private async handleHit(
    game: {
      id: string;
      gameRoundId: string;
      betAmount: bigint;
      playerCards: unknown;
      dealerCards: unknown;
    },
    playerCards: BlackjackCard[],
    dealerCards: BlackjackCard[],
  ) {
    playerCards.push(this.drawCard());

    const playerResult = this.calculateHandValue(playerCards);
    const dealerResult = this.calculateHandValue(dealerCards);

    if (playerResult.score > 21) {
      await this.prisma.blackjackGame.update({
        where: { id: game.id },
        data: {
          playerCards: this.toRequiredInputJsonValue(
            this.cardsToJson(playerCards),
          ),
          playerScore: playerResult.score,
          playerSoft: playerResult.soft,
          status: BlackjackGameStatus.PLAYER_BUST,
        },
      });

      await this.betService.settleLoss({
        roundId: game.gameRoundId,
        metadata: {
          playerCards: this.cardsToJson(playerCards),
          dealerCards: this.cardsToJson(dealerCards),
          playerScore: playerResult.score,
          dealerScore: dealerResult.score,
          outcome: 'PLAYER_BUST',
        },
      });

      await this.prisma.blackjackGame.update({
        where: { id: game.id },
        data: {
          status: BlackjackGameStatus.FINISHED,
        },
      });

      return this.formatGameResponse({
        id: game.id,
        status: BlackjackGameStatus.PLAYER_BUST,
        betAmount: game.betAmount,
        playerCards,
        dealerCards,
        playerScore: playerResult.score,
        dealerScore: dealerResult.score,
      });
    }

    const updatedGame = await this.prisma.blackjackGame.update({
      where: { id: game.id },
      data: {
        playerCards: this.toRequiredInputJsonValue(
          this.cardsToJson(playerCards),
        ),
        playerScore: playerResult.score,
        playerSoft: playerResult.soft,
      },
    });

    return this.formatGameResponse({
      id: updatedGame.id,
      status: updatedGame.status,
      betAmount: updatedGame.betAmount,
      playerCards,
      dealerCards,
      playerScore: playerResult.score,
      dealerScore: dealerResult.score,
    });
  }

  private async handleStand(
    game: {
      id: string;
      gameRoundId: string;
      betAmount: bigint;
    },
    playerCards: BlackjackCard[],
    dealerCards: BlackjackCard[],
  ) {
    let dealerResult = this.calculateHandValue(dealerCards);
    const playerResult = this.calculateHandValue(playerCards);

    while (dealerResult.score < 17) {
      dealerCards.push(this.drawCard());
      dealerResult = this.calculateHandValue(dealerCards);
    }

    let finalStatus: BlackjackGameStatus;
    let payout = 0;

    if (dealerResult.score > 21) {
      finalStatus = BlackjackGameStatus.DEALER_BUST;
      payout = Number(game.betAmount) * 2;
    } else if (playerResult.score > dealerResult.score) {
      finalStatus = BlackjackGameStatus.PLAYER_WIN;
      payout = Number(game.betAmount) * 2;
    } else if (playerResult.score < dealerResult.score) {
      finalStatus = BlackjackGameStatus.DEALER_WIN;
      payout = 0;
    } else {
      finalStatus = BlackjackGameStatus.PUSH;
      payout = Number(game.betAmount);
    }

    await this.prisma.blackjackGame.update({
      where: { id: game.id },
      data: {
        dealerCards: this.toRequiredInputJsonValue(
          this.cardsToJson(dealerCards),
        ),
        dealerScore: dealerResult.score,
        dealerSoft: dealerResult.soft,
        status: finalStatus,
      },
    });

    if (payout > 0) {
      await this.betService.settleWin({
        roundId: game.gameRoundId,
        payout,
        metadata: {
          playerCards: this.cardsToJson(playerCards),
          dealerCards: this.cardsToJson(dealerCards),
          playerScore: playerResult.score,
          dealerScore: dealerResult.score,
          outcome: finalStatus,
        },
      });
    } else {
      await this.betService.settleLoss({
        roundId: game.gameRoundId,
        metadata: {
          playerCards: this.cardsToJson(playerCards),
          dealerCards: this.cardsToJson(dealerCards),
          playerScore: playerResult.score,
          dealerScore: dealerResult.score,
          outcome: finalStatus,
        },
      });
    }

    await this.prisma.blackjackGame.update({
      where: { id: game.id },
      data: {
        status: BlackjackGameStatus.FINISHED,
      },
    });

    return this.formatGameResponse({
      id: game.id,
      status: finalStatus,
      betAmount: game.betAmount,
      playerCards,
      dealerCards,
      playerScore: playerResult.score,
      dealerScore: dealerResult.score,
    });
  }

  private async resolveNaturalBlackjack(
    gameId: string,
    roundId: string,
    betAmount: number,
    playerCards: BlackjackCard[],
    dealerCards: BlackjackCard[],
    playerScore: number,
    dealerScore: number,
  ) {
    const playerHasBlackjack =
      playerCards.length === 2 && playerScore === 21;
    const dealerHasBlackjack =
      dealerCards.length === 2 && dealerScore === 21;

    let status: BlackjackGameStatus;
    let payout = 0;

    if (playerHasBlackjack && dealerHasBlackjack) {
      status = BlackjackGameStatus.PUSH;
      payout = betAmount;
    } else if (playerHasBlackjack) {
      status = BlackjackGameStatus.PLAYER_BLACKJACK;
      payout = Math.floor(betAmount * 2.5);
    } else {
      status = BlackjackGameStatus.DEALER_WIN;
      payout = 0;
    }

    await this.prisma.blackjackGame.update({
      where: { id: gameId },
      data: {
        status,
      },
    });

    if (payout > 0) {
      await this.betService.settleWin({
        roundId,
        payout,
        multiplier:
          playerHasBlackjack && !dealerHasBlackjack ? 2.5 : undefined,
        metadata: {
          playerCards: this.cardsToJson(playerCards),
          dealerCards: this.cardsToJson(dealerCards),
          playerScore,
          dealerScore,
          outcome: status,
        },
      });
    } else {
      await this.betService.settleLoss({
        roundId,
        metadata: {
          playerCards: this.cardsToJson(playerCards),
          dealerCards: this.cardsToJson(dealerCards),
          playerScore,
          dealerScore,
          outcome: status,
        },
      });
    }

    await this.prisma.blackjackGame.update({
      where: { id: gameId },
      data: {
        status: BlackjackGameStatus.FINISHED,
      },
    });

    return this.formatGameResponse({
      id: gameId,
      status,
      betAmount: BigInt(betAmount),
      playerCards,
      dealerCards,
      playerScore,
      dealerScore,
    });
  }

  private drawCard(): BlackjackCard {
    const suit = this.suits[Math.floor(Math.random() * this.suits.length)];
    const rank = this.ranks[Math.floor(Math.random() * this.ranks.length)];

    return { rank, suit };
  }

  private calculateHandValue(cards: BlackjackCard[]) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        total += 11;
        aces += 1;
      } else if (['J', 'Q', 'K'].includes(card.rank)) {
        total += 10;
      } else {
        total += Number(card.rank);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return {
      score: total,
      soft: aces > 0,
    };
  }

  private cardToJson(card: BlackjackCard): JsonObject {
    return {
      rank: card.rank,
      suit: card.suit,
    };
  }

  private cardsToJson(cards: BlackjackCard[]): JsonObject[] {
    return cards.map((card) => this.cardToJson(card));
  }

  private toRequiredInputJsonValue(
    data: JsonObject | JsonObject[],
  ): Prisma.InputJsonValue {
    return data as Prisma.InputJsonValue;
  }

  private formatGameResponse(data: {
    id: string;
    status: BlackjackGameStatus;
    betAmount: bigint;
    playerCards: BlackjackCard[];
    dealerCards: BlackjackCard[];
    playerScore: number;
    dealerScore: number;
  }) {
    const visibleDealerCards = this.getVisibleDealerCards(
      data.status,
      data.dealerCards,
    );

    const visibleDealerScore = this.getVisibleDealerScore(
      data.status,
      data.dealerCards,
      data.dealerScore,
    );

    return {
      gameId: data.id,
      status: data.status,
      betAmount: data.betAmount.toString(),
      playerCards: data.playerCards,
      dealerCards: visibleDealerCards,
      playerScore: data.playerScore,
      dealerScore: visibleDealerScore,
    };
  }
}