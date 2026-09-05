import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ---------------- WEATHER TOOL ----------------

async function getWeather(city) {
  const url = `https://wttr.in/${city.toLowerCase()}?format=%C+%t`;

  const response = await axios.get(url, {
    responseType: "text",
  });

  return `The weather of ${city} is ${response.data}`;
}

// ---------------- EMAIL TOOL ----------------

async function sendEmail(toEmail, subject, body) {
  // email sending logic here

  return `Email sent to ${toEmail}`;
}

// ---------------- TOOL DEFINITIONS ----------------

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description:
          "Returns the current weather information for the given city",

        parameters: {
          type: "OBJECT",
          properties: {
            city: {
              type: "STRING",
              description: "name of the city",
            },
          },
          required: ["city"],
        },
      },

      {
        name: "send_email",
        description: "This tool sends an email",

        parameters: {
          type: "OBJECT",
          properties: {
            toEmail: {
              type: "STRING",
              description: "email address to",
            },
            subject: {
              type: "STRING",
              description: "subject of the email",
            },
            body: {
              type: "STRING",
              description: "body of the email",
            },
          },
          required: ["toEmail", "subject", "body"],
        },
      },
    ],
  },
];

// ---------------- AGENT ----------------
async function main(query = "") {

  let response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: query,
    config: {
      systemInstruction: `
        You are an expert weather agent
        that helps users get weather reports.
      `,
      tools,
    },
  });
  console.log(" ai start says ",response.text);
 while(response.functionCalls?.length) {

  const toolResults = [];

  for (const call of response.functionCalls) {

    console.log("calling:", call.name);
    console.log("args:", call.args);

    let result;

    if (call.name === "get_weather") {
      result = await getWeather(call.args.city);
      console.log(result);
    }

    if (call.name === "send_email") {
      result = await sendEmail(
        call.args.toEmail,
        call.args.subject,
        call.args.body
      );
    }

    console.log("result:", result);

    toolResults.push({
      functionResponse: {
        name: call.name,
        response: {
          result,
        },
      },
    });
  }

  response = await ai.models.generateContent({
    model: "gemini-3.5-flash",

    contents: [
      {
        role: "user",
        parts: [{ text: query }],
      },
      {
        role: "model",
        parts: response.candidates[0].content.parts,
      },
      {
        role: "user",
        parts: toolResults,
      },
    ],

    config: {
      systemInstruction: `
        You are an expert weather agent
        that helps users get weather reports.
      `,
      tools,
    },
  });
  console.log(" ai end says ",response.text)
}

  console.log("Result: ", response.text);
}
main("give me weather of delhi and chennai")