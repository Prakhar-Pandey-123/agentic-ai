import "dotenv/config"
import OpenAI from "openai"
import {Agent,run,setDefaultOpenAIClient,setOpenAIAPI,setTracingDisabled} from "@openai/agents"
import {z} from "zod"

// create openai custom client that has gemini api keys
const client=new OpenAI({
    apiKey:process.env.GEMINI_API_KEY,
    baseURL:"https://generativelanguage.googleapis.com/v1beta/openai/",
})

// set this custom client as default
setDefaultOpenAIClient(client);

// gemini=chat_completion and openai=responses
setOpenAIAPI("chat_completions");

// off the openai tracing coz gemini dont allow it
setTracingDisabled(true);

// create input guardrail agent= tells if question is maths or not
const mathinputagent=new Agent({
    name:"math query checker",
    model:"gemini-3.5-flash",
    instructions:`you are input guardrail agent that checks if the input is maths question or not.
    rules:-the question has to be strictly a maths question only.
    -reject any other request if not related to maths.`,
    //tell the output type=object(2 keys-value)
    outputType:z.object({
        isvalidmathsquestion:z.boolean().describe("whether the question is a valid maths or not"),
        reason:z.string().optional().describe("reason why question is rejected")
    })  
})

// now creating input guardrail
const mathinputguardrail={
    name:"math homework guardrail",
    runInParallel: false,
    execute:async({input})=>{
        // run agent to know if this question is maths or not
        const result=await run(mathinputagent,input);
        return {
            outputinfo:result.finalOutput.reason,
            // if agent says true=maths question then dont pull the tripwire
            tripwiretriggered:!result.finalOutput.isvalidmathsquestion
        }
    }
}

// main maths agent and attach that guardrail created above to this agent
const mathsagent=new Agent({
    name:"maths agent",
    model:"gemini-3.5-flash",
    instructions:"you are expert maths ai agent",
    inputGuardrails:[mathinputguardrail]
})

// run the agent 
async function main(q="") {
    try{
    const result=await run(mathsagent,q);
    console.log("result:",result.finalOutput);
    }
    catch(e){
        console.log("error");
    }
}

main("what is 2+2 ? ");