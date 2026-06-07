// Shared prompt builder used by all providers
export const createPrompt = (selectedLanguage: string, method: string): string => {
  return `from now on talk to me as if I am talking to a ${
    selectedLanguage ? `${selectedLanguage} library` : "programming"
  }${
    method ? ` which is using ${method}` : ""
  } you are a server for it. I will give you a payload; give me the response in exact API JSON format block.`;
};
