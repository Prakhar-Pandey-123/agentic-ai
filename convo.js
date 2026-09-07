import "dotenv/config"
import {Agent,run,tool,setDefaultOpenAIClient,setOpenAIAPI,setTracingDisabled} from "@openai/agents"
import {z} from "zod"
import OpenAI from "openai"

let sharedhistory=[];

const client=new OpenAI({
    apiKey:process.env.GEMINI_API_KEY,
    baseURL:"https://generativelanguage.googleapis.com/v1beta/openai/",
})
setDefaultOpenAIClient(client);
setOpenAIAPI("chat_completions");
setTracingDisabled(true);

const executesql=tool({
    name:'execute_sql',
    description:'this executes the sql query',
    parameters:z.object({
        sql:z.string().describe('the sql query')
    }),
    execute:async function({sql}) {
        console.log(`executed ${sql}`)
        return `done`;
    }
})

const sqlagent=new Agent({
    name:'sql expert',
    tools:[executesql],
    model:"gemini-3.5-flash",
    instructions:`you are expert sql agent that generate sql queries as per user request.
    schema:
    CREATE TABLE users{
    id SERIAL PRIMARY KEY,
    username VARCHAR(50)  UNIQUE NOT NULL
    }`,
})

async function main(q=``){
    sharedhistory.push({role:'user',content:q});
    const result=await run(sqlagent,sharedhistory);
    sharedhistory=result.history;
    console.log("final out:",result.finalOutput);
}

// async function main(q=``) {
//     const result=await run(sqlagent,q);
//     console.log(result.history)
//     console.log("final out:",result.finalOutput);
// }

main('hi my name is prakhar').then(()=>{
    main('get me all users with my name');
})