import "dotenv/config"
import {Agent,tool,run,setDefaultOpenAIClient,setOpenAIAPI} from "@openai/agents"
import OpenAI from "openai"
import {z} from "zod"
import fs from "node:fs/promises"

// creating a custom openai client , client is basically used to talk to llm hence we can skip axios calls to llm(here gemini)
const client=new OpenAI({
    apiKey:process.env.GEMINI_API_KEY,
    baseURL:"https://generativelanguage.googleapis.com/v1beta/openai/"
})

//tell sdk to use this custom client,by default it would use openai but now use our client
setDefaultOpenAIClient(client);

//tell which api format to use , default is openai format(responses) but gemini uses (chat-completion)
setOpenAIAPI("chat_completions")

// creating the tool for agent to use, llm tells to use this tool ,then sdk will use it
const fetchavailableplans=tool({
    name:"fetch_available_plans",
    description:"fetches the available internet plans",
    parameters:z.object({}),
    execute:async function(){
        return [{
            plan_id:"1",
            price:399,
            speed:"30MB/S"
        },{
            plan_id:"2",
            price:499,
            speed:"40MB/S"
        }]
    }
})
const processrefund=tool({
    name:"process_refund",
    description:"processes a refund for a customer",
    parameters:z.object({
        customerId:z.string().describe("id of the customer"),
        reason:z.string().describe("reason for refund")
    }),
    execute:async function ({customerId,reason}) {
        await fs.appendFile(
            "./refunds.txt",
            `refund for customer ${customerId} because ${reason}`,
            "utf-8"
        )
        return {
            refundissued:true
        }
    }
})

// refund agent = this agent can call processrefund function (can use it as a tool)
const refundagent=new Agent({
    name:"refund agent",
    instructions:`you are refund agent.handle customer refund requests.use the process_refund tool`,
    model: "gemini-3.8-flash",
    tools:[processrefund]
})
// sales agent that can use check plan tool to get the plans , it can also use the refundagent as a tool to refund the plan,it cant directly access the function.
const salesagent=new Agent({
    name:"sales_agent",
    instructions:`you are sales agent for internet broadband company. talk to customer to help them ,you can use the plans tool to show plans to the use.
    you can also refund the amount by calling the refund agent and using it as a tool
    `,
    model: "gemini-3.8-flash",
    tools:[
        fetchavailableplans,
        //refund agen as tool
        refundagent.asTool({
            toolName:`refund_expert`,
            toolDescription:"handle customer refund requests "
        })
    ]
})

// run() the agent sdk, now sdk can handle agent loops internally,can call the llm multiple times if required  
async function runagent(query=""){
    const result=await run(
        salesagent,
        query
    );
    console.log(result.finalOutput);
}

runagent(" tell me about current plans,i had a plan 399 .my customer id is 123 .i want refund right now i am shifting to a new place");

