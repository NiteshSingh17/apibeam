
export type AgentAction = {
  type: 'ask_question',
  content: {
    body: JSON;
    route: string;
  },
};

