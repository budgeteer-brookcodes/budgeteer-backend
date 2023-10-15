import { User } from '@prisma/client';

export enum ConversationStage {
  FIRST_INCOME,
  SAVINGS_PERCENT
}

type Conversation = {
  id: number;
  user: User;
  currentStage: string;
  income: number | undefined;
  savings: number | undefined;
  debt: number | undefined;
  expenses: number | undefined;
};

type FailedConversationResponse = {
  moveOn: false;
  error: string;
};

type GoodConversationResponse = {
  moveOn: true;
};

type ConversationResponse =
  | FailedConversationResponse
  | GoodConversationResponse;

const conversationStages = [
  'FIRST_INCOME',
  'EXPENSES',
  'DEBT',
  'SAVINGS_PERCENT'
];

const conversationQuestions: Record<string, (convo: Conversation) => string> = {
  FIRST_INCOME: convo => 'no question',
  EXPENSES: convo => 'How much do you usually spend every month?',
  SAVINGS_PERCENT: convo =>
    'What percent do you want to put into savings? (I recommend 10-20%)',
  DEBT: convo => 'How much debt are you in?'
};

class ConversationManager {
  public static conversations: Conversation[] = [];
  private static id = 0;

  public static createConversation(user: User) {
    const id = this.id;
    this.conversations.push({
      id,
      user,
      currentStage: 'FIRST_INCOME',
      income: undefined,
      savings: undefined,
      debt: undefined,
      expenses: undefined
    });

    this.id++;

    return id;
  }

  public static getConversation(id: number) {
    if (id < 0 || id >= this.conversations.length) {
      return null;
    }

    return this.conversations[id];
  }

  public static handleMessage(
    message: string,
    conversation: Conversation
  ): ConversationResponse {
    const stage = conversation.currentStage;
    switch (stage) {
      case 'FIRST_INCOME': {
        if (!/^\d+$/.test(message)) {
          return {
            moveOn: false,
            error:
              "Sorry, I don't understand. Please respond with only your income (no letters, no dollar sign)."
          };
        }

        const income = Number.parseInt(message);
        if (income < 0) {
          return {
            moveOn: false,
            error: "That's not right. Please try again"
          };
        }

        conversation.income = income;

        return {
          moveOn: true
        };
        break;
      }
      case 'SAVINGS_PERCENT': {
        if (!/^\d+$/.test(message)) {
          return {
            moveOn: false,
            error:
              "Sorry, I don't understand. Please respond with only a number (no percentage sign)."
          };
        }

        const savings = Number.parseInt(message);
        if (savings < 0 || savings > 100) {
          return {
            moveOn: false,
            error: "That's not right. Please try again"
          };
        }

        conversation.savings = savings;

        return {
          moveOn: true
        };
        break;
      }
      case 'EXPENSES': {
        if (!/^\d+$/.test(message)) {
          return {
            moveOn: false,
            error:
              "Sorry, I don't understand. Please respond with only a number (no percentage sign)."
          };
        }

        const expenses = Number.parseInt(message);
        if (expenses < 0) {
          return {
            moveOn: false,
            error: "That's not right. Please try again"
          };
        }

        conversation.expenses = expenses;

        return {
          moveOn: true
        };
        break;
      }
      case 'DEBT': {
        if (!/^\d+$/.test(message)) {
          return {
            moveOn: false,
            error:
              "Sorry, I don't understand. Please respond with only a number (no dollar sign)."
          };
        }

        const debt = Number.parseInt(message);
        if (debt < 0) {
          return {
            moveOn: false,
            error: "That's not right. Please try again"
          };
        }

        conversation.debt = debt;

        return {
          moveOn: true
        };
        break;
      }
      default:
        return {
          moveOn: false,
          error: 'Sorry, something went wrong! :('
        };
        break;
    }
  }

  public static moveOn(conversation: Conversation) {
    const nextIndex =
      conversationStages.findIndex(
        stage => stage === conversation.currentStage
      ) + 1;
    if (nextIndex < 0 || nextIndex >= conversationStages.length) {
      return false;
    }

    conversation.currentStage = conversationStages[nextIndex];
    return conversationQuestions[conversation.currentStage](conversation);
  }

  public static finish(conversation: Conversation) {
    if (
      conversation.income === undefined ||
      conversation.savings === undefined ||
      conversation.debt === undefined ||
      conversation.expenses === undefined
    ) {
      return 'Sorry, it seems some data is missing!';
    }

    const yearlyIncome = conversation.income * 12;
    let taxed = conversation.income * 0.75;
    const origTaxed = taxed;
    const expenses = conversation.expenses;
    taxed -= expenses;
    const debt = Math.min(conversation.debt, origTaxed * 0.35);
    taxed -= debt;
    const moneyToSave = origTaxed * (conversation.savings / 100);
    taxed -= moneyToSave;

    return `Alright, here you go:\nYearly income: $${yearlyIncome}\nMoney after taxes (monthly): ~$${origTaxed}\nMoney to save (monthly): $${moneyToSave}\nMoney spent on expenses (monthly): $${expenses}\nMoney spent on debt (monthly): $${debt}\nOverall, you have $${taxed} left over for yourself!\nAcheivable: ${
      taxed > 0 ? 'yes' : 'no'
    }`;
    return 'Thanks for talking to me!'; // tell the user his data
  }
}

export default ConversationManager;
