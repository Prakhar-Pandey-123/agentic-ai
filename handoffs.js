import "dotenv/config"
import OpenAI from "openai"
import {Agent,tool,run,setDefaultOpenAIClient,setOpenAIAPI,setTracingDisabled} from "@openai/agents"
import {z} from "zod"
import fs from "node:fs/promises"

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

// creating tool for refund agent
const processrefund=tool({
    name:"process_refund",
    description:"this tool processes the refund for customer",
    parameters:z.object({
        customerId:z.string().describe("id of customer"),
        reason:z.string().describe("reason for refund")
    }),
    execute:async function ({customerId,reason}) {
        await fs.appendFile("./refund.txt",
            `refund for customer for id ${customerId} for ${reason}`,
            "utf-8"
        );
        return {refundissued:true};
    }
})

// creating refund agent and giving it tools
const refundagent=new Agent({
    name:"refund agent",
    instructions:`you are expert in giving refunds to customer`,
    model:"gemini-3.5-flash",
    tools:[processrefund]
})

// sales tools for sales agent
const fetchAvailablePlans = tool({
  name: "fetch_available_plans",
  description: "fetches the available plans for internet",
  parameters: z.object({}),
  execute: async function () {
    return [
      {
        plan_id: "1",
        price_inr: 399,
        speed: "30MB/s",
      },
      {
        plan_id: "2",
        price_inr: 999,
        speed: "100MB/s",
      },
    ];
  },
});

// sales agent
const salesagent=new Agent({
    name:"sales agent",
    instructions:`you are sales agent for internet broadband company .talk to user and tell them all plans`,
    model:"gemini-3.5-flash",
    tools:[
        fetchAvailablePlans,
        refundagent.asTool({
            toolName:"refund_expert",
            toolDescription:`handles refund requests`
        })
    ]
})

// reception agent that handles the whole flow and passes the control to required agent 
const receptionagent=new Agent({
    name:"reception agent",
    instructions:"you are customer facing agent ,understand what customer needs and then route them or handoff them to the right agent.",
    model:"gemini-3.5-flash",
    handoffDescription:`You have two agents available:
    - salesAgent:
      Expert in handling queries like all plans and pricing available.
    - refundAgent:
      Expert in handling user queries for existing customers,
      issuing refunds.`,
      handoffs:[salesagent,refundagent]
})
// run the agent ,we are using openai sdk (custom)
async function main(query="") {
    const result=await run(
        receptionagent,query
    )
    console.log("result:",result.finalOutput);
    console.log("history:",result.history);
}

main(`Hi There, I am customer having id 234
  and I want to have a refund request for no reason atall ,just refund it `)