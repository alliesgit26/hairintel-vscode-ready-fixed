const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function fetchOpenAICompletion() {
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: "Hello, world!",
      max_tokens: 50,
    });

    console.log(response.data.choices[0].text.trim());
  } catch (error) {
    console.error("Error fetching completion from OpenAI:", error);
  }
}

fetchOpenAICompletion();