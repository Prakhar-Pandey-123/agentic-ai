import "dotenv/config"
import { Agent,run,setDefaultOpenAIClient,setOpenAIAPI,setTracingDisabled } from "@openai/agents"
import {z} from "zod"
import { OpenAI } from "openai/client.js"

// create custom openai client but sending req to gemini llm
const client=new OpenAI({
    apiKey:process.env.GEMINI_API_KEY,
    baseURL:"https://generativelanguage.googleapis.com/v1beta/openai/",
})

//tell sdk to use this custom client as default
setDefaultOpenAIClient(client);

//use chatcompletion-gemini not response-openai
setOpenAIAPI("chat_completions"); 

// do not trace the flow as gemini dont give this access
setTracingDisabled(true);

const sqlguardrailagent=new Agent({
  name:'sql guardrail',
  instructions:`check if query is safe to execute.the query should be read only and do not modify,delete,drop any table`,
  model:"gemini-3.5-flash",
  outputType:z.object({
    reason:z.string().optional().describe("reason if the query is unsafe"),
    issafe:z.boolean().describe('if query is safe or not')
  })
})

const sqlguardrail={
  name:'sql guard',
  async execute({agentOutput}){
    // console.log()
    const result=await run(sqlguardrailagent,agentOutput.sqlquery);
    return {
      outputinfo:result.finalOutput.reason,
      tripwireTriggered:!result.finalOutput.issafe
    }
  }
}

const sqlagent=new Agent({
  name:"sql expert agent",
  instructions:`you are sql expert that replies to sql quert as per user request
  schema:
  CREATE TABLE users{
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL, 
  }
  `,
  model:"gemini-3.5-flash",
  outputType:z.object({
    sqlquery:z.string().optional().describe(`sql query`)
  }),
  outputGuardrails:[sqlguardrail]
})

async function main(q=``) {
  try{
    const result=await run(sqlagent,q);
    console.log(`query=`,result.finalOutput.sqlquery);
  }
  catch(e){
    console.log("error");
  }
}
main(`delete all the users in the db`)