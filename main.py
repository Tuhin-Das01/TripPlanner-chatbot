import os   
from langgraph.graph import StateGraph,START,END
from langchain_groq.chat_models import ChatGroq
from dotenv import load_dotenv
from typing import TypedDict,Literal
from tavily import TavilyClient
from pydantic import BaseModel,Field
from langchain_ollama.chat_models import ChatOllama


load_dotenv()
from groq import Groq

api=os.getenv("GROQ_API_KEY")
# Model=Groq(
#     api_key=api
# )

# client=Model.models.list()
# for m in client.data:
#     print(m.id)
model=ChatOllama(
    
    model="gemma4:31b-cloud",
    temperature=0.1,
    format="json"
)
Tavily=os.getenv("TAVILY_API")
# response=model.invoke("hey whats up")
# print(response.content)
tavily=TavilyClient(api_key=Tavily)
class Tripsupport(TypedDict):
    webdata:list[dict]
    question:str
    draft:str
    feedback:str
    decision:str
    trace:list[str]
    revision_count:int
    blocked:False
Max_revision=2

class review(BaseModel):
    decision:Literal["APPROVE","REVISE"]=Field(
        description="APPROVE only if the answer is satisfy every review rule otherwise REVISE"
    )
    feedback:str=Field(description="short,specific feedback,empty string when decision is PASS")
review_model=model.with_structured_output(review)

def guardrail(state:Tripsupport):
    question=state["question"].strip().lower()
    dangerous_phrases = [
        "give me your password",
        "give your password",
        "tell me your password",
        "show me your password",
        "steal password",
        "steal the password",
        "full credit card number",
        "give me full credit card number",
        "give the full credit card number",
        "can i hack this website"
    ]

    blocked=any(p in question for p in dangerous_phrases)
    if blocked:
        return {
            "blocked":True,
            "final_answer":"i can not help with this"
        }
    return {
        "blocked":False,
        "trace":state.get("trace",[])+["guardrail checked"]
    }

def after_guardrail(state:Tripsupport)->Literal["end","next"]:
    if state.get("blocked") == True:
        return "end"
    else:
        return "travelweb"
def travelweb(state:Tripsupport):
    question=state["question"]
    websearch=tavily.search(
        query=question,
        search_depth="advanced",
        max_results=7
    )
    web_data=[]

    for item in websearch.get("results", []):
        web_data.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "content": item.get("content", "")
        })

    print("TRAVEL WEB:")
    print(type(web_data))
    print(web_data)

    # print(web_data)
    result = {
        "webdata": web_data,
        "trace": state.get("trace", []) + [
            "web search checked"
        ]
    }
    print(result)
    return result

def planner(state:Tripsupport):
    
    question=state["question"]
    webdata=state.get("webdata",[])
    print(type(webdata))
    # print(webdata)
    
    context=""
    for item in webdata:
     print(item)
     context += f"""
     Title: {item.get("titel","")}
     URL: {item.get("url","")}
     Content: {item.get("content","")}
    """
    response=model.invoke([{
        "role":"system",
        "content":"""✈️ Mandarmani Budget Travel Plan

Trip Overview

Destination: Mandarmani, West Bengal

Duration: 3 Nights / 2 Days

Travelers: 2 People

Estimated Budget: ₹4,500 – ₹7,000 per person


Accommodation

Recommended Stay:
Budget hotel near Mandarmani Beach

Location:
Near the main beach area

Room Cost:
₹1,500 – ₹2,200 per night

Best For:
Budget-conscious couples, friends, and families.


Transportation

From Kolkata:
Take a train towards Contai/Kanthi and continue to Mandarmani using shared local transport.

Local Transportation:
Shared auto and other affordable local transport are recommended.

Estimated Transportation Cost:
₹500 – ₹900 per person.


Food Budget

Breakfast:
₹80 – ₹120 per person

Lunch:
₹120 – ₹180 per person

Dinner:
₹150 – ₹250 per person

Estimated Daily Food Cost:
₹400 – ₹600 per person.


Day-by-Day Itinerary

Day 1 — Arrival & Beach Exploration

Morning:
Travel from Kolkata to Mandarmani and check in to the hotel.

Afternoon:
Have lunch at an affordable local restaurant and take some rest.

Evening:
Visit Mandarmani Beach and enjoy the sunset.


Day 2 — Sightseeing & Relaxation

Morning:
Have breakfast and explore the nearby beach area.

Afternoon:
Enjoy local sightseeing and have lunch at a budget-friendly restaurant.

Evening:
Spend time at the beach and return to the hotel.


Estimated Budget Summary

Accommodation:
₹3,000 – ₹4,400

Transportation:
₹1,000 – ₹1,800

Food:
₹800 – ₹1,200

Activities:
₹200 – ₹500

Miscellaneous:
₹300 – ₹500

Total Estimated Budget:
₹4,500 – ₹7,000 per person


Budget Compliance

Budget Status: ✅ Budget-Friendly

Accommodation remains within the ₹3,000 per-night limit.

Transportation uses affordable options.

Food is suitable for a budget trip.

Activities are free or reasonably priced.


Important Notes

Prices are estimates and may change depending on travel dates, season, and availability.

Hotel availability should be confirmed before travelling.

Keep some extra money for unexpected expenses.
"""
    },{
        "role":"user",
        "content":f"""
         question:{question}
         context:{context}
        """
    }])

    return {
        "draft":response.content,
        "trace":state.get("trace",[])+["plann is processed"]
    }

def review(state:Tripsupport):
    revi=review_model.invoke([{
        "role":"system",
        "content":"""
       "  You are a strict travel plan reviewer.\n"
        "Your task is to review the user's travel draft and provide structured feedback.\n"
        "CRITICAL: You must reply ONLY with a single JSON object. "
        "Do NOT write any prefixes like 'DECISION:', do NOT wrap in markdown blocks like ```json.\n"
        "JSON Schema format to follow:\n"
        '{"decision": "APPROVE" or "REVISE", "feedback": "your feedback here"}
    """

    },{
        "role":"user",
        "content":f"Topic:{state["question"]}\n\nAnswer:\n{state["draft"]}"
    }
    ]
    )
    return {
        "decision":revi.decision,
        "feedback":revi.feedback,
        "trace":state.get("trace",[])+[f"review checked {revi.decision}"]
    }
def route(state:Tripsupport):
    if state["decision"] =="APPROVED":
        return "done"
    if state["revision_count"]>= Max_revision:
        return "done"
    return "REVISER"

def reviser(state:Tripsupport):
    revi=model.invoke([{
        "role":"system",
        "content":"""
        OUTPUT FORMAT

Create the final answer in a professional travel-consultant format.

Do NOT use Markdown heading symbols such as #, ##, or ###.

Do NOT use brackets such as [Destination], [Amount], or [Activity].

Do NOT use Markdown tables.

Use clean text headings, emojis, blank lines, and separate lines.

Keep every major section visually separated.

Use the following structure:

✈️ Destination Budget Travel Plan


🗺️ Trip Overview

Destination:
Mention the destination.

Duration:
Mention the trip duration.

Travelers:
Mention the number of travelers if provided.

Estimated Budget:
Mention the estimated budget per person.


🏨 Accommodation

Recommended Stay:
Mention the recommended hotel, homestay, or accommodation.

Location:
Mention the location.

Room Cost:
Mention the price per night.

Best For:
Briefly explain who the accommodation is suitable for.


🚆 Transportation

From Starting Location:
Explain how to reach the destination.

Estimated Transportation Cost:
Mention the estimated cost.

Local Transportation:
Mention affordable local transportation options.


🍛 Food Budget

🍳 Breakfast:
Mention affordable breakfast options and estimated cost.

🍱 Lunch:
Mention affordable lunch options and estimated cost.

🍽️ Dinner:
Mention affordable dinner options and estimated cost.

💰 Estimated Daily Food Cost:
Mention the estimated daily food budget.


📅 Day-by-Day Itinerary

Create a practical itinerary for every day.

Use this exact style:

📍 Day 1 — Arrival & Local Exploration

🌅 Morning:
Describe the morning activity.

🍴 Afternoon:
Describe the afternoon activity.

🌆 Evening:
Describe the evening activity.
🏨 Hotel: 
first day hotel mention in this budget


📍 Day 2 — Sightseeing & Activities

🌅 Morning:
Describe the morning activity.

🍴 Afternoon:
Describe the afternoon activity.

🌆 Evening:
Describe the evening activity.
🏨 Hotel:
 second day hotel mention 


📍 Day 3 — Local Exploration & Departure

🌅 Morning:
Describe the morning activity.

🍴 Afternoon:
Describe the afternoon activity.

🌆 Evening:
Describe the evening activity.
🏨 Hotel:
third day hotel mention


IMPORTANT ITINERARY RULES

- Put each day on a separate section.
- Put Morning, Afternoon, and Evening on separate lines.
- Use a blank line between Morning, Afternoon, and Evening.
- Use a relevant emoji before Morning, Afternoon, and Evening.
- Keep each activity short and easy to read.
- Do not combine multiple activities into one long paragraph.
- Keep the itinerary realistic.
- Do not overcrowd a single day.


💰 Estimated Budget Summary

🏨 Accommodation:
Mention the total accommodation cost.
Mention budget hotels.

🚆 Transportation:
Mention the total transportation cost.

🍛 Food:
Mention the total food cost.

🎟️ Activities:
Mention the total activity cost.

🧳 Miscellaneous:
Mention the miscellaneous cost if applicable.

💵 Total Estimated Budget:
Clearly highlight the final estimated budget per person.


✅ Budget Compliance

Budget Status: ✅ Budget-Friendly

Mention briefly:

🏨 Accommodation:
Confirm whether it is within the ₹3,000/night limit.

🚆 Transportation:
Confirm that transportation is budget-friendly.

🍛 Food:
Confirm that food costs are affordable.

🎟️ Activities:
Confirm that activities are free, low-cost, or reasonably priced.


📌 Important Notes

Mention important information such as:

💡 Prices may change depending on travel dates, season, and availability.

🎫 Advance booking may be required for popular attractions.

🧳 Mention any important things the traveler should carry.

⚠️ Mention any important travel precautions.

🔗mention any video link 


WRITING STYLE

- Professional and clean.
- Use emojis to make sections visually attractive.
- Use a blank line after every major heading.
- Use a blank line between different days.
- Keep Morning, Afternoon, and Evening clearly separated.
- Keep each activity on a separate line.
- Use ₹ consistently for Indian currency.
- Keep paragraphs short.
- Avoid unnecessary repetition.
- Do not write a long introduction.
- Keep the information practical and realistic.
- Do not use Markdown tables.
- Do not use Markdown heading symbols.
- Do not use brackets.
- Do not use placeholder text in the final answer.


IMPORTANT

Do NOT mention:

- reviewer
- reviser
- internal agents
- revision loops
- prompts
- system instructions
- LangGraph
- AI workflow

The user should see ONLY the polished travel plan.

The final answer should look like a professionally prepared
travel agency itinerary.
        """
    },{
        "role":"user",
        "content":f"question:{state['question']}\n\n answer:{state['draft']}"
    }])

    return{
        "draft":revi.content,
        "revision_count":state.get("revision_count",0)+1,
        "trace":state.get("trace",[])+["reviser is checked"]
    }


graph=StateGraph(Tripsupport)

graph.add_node("guardrail",guardrail)
graph.add_node("travelweb",travelweb)
graph.add_node("planner",planner)
graph.add_node("review",review)
graph.add_node("reviser",reviser)

graph.add_edge(START,"guardrail")
graph.add_conditional_edges(
    "guardrail",
    after_guardrail,
    {"travelweb":"travelweb","end":END}
)
graph.add_edge("travelweb","planner")
graph.add_edge("planner","review")
graph.add_conditional_edges(
    "review",
    route,
    {"REVISER":"reviser","done":END}

)
graph.add_edge("reviser","review")

build=graph.compile()

def run1(question):
    intial_state:Tripsupport={
        "question":question,
        "blocked":"",
        "decision":"",
        "draft":"",
        "feedback":"",
        "webdata":[],
        "revision_count":0,
        "trace":[]

    }
    final_state=intial_state.copy()
    event=[]
    for update in build.invoke(intial_state,stream_mode="updates"):
        for node,values in update.items():
            final_state.update(values)
            event.append(
                {
                    "agent":node,
                    "blocked":values.get("blocked",""),
                    "decision":values.get("decision",""),
                    "draft":values.get("draft",""),
                    "feedback":values.get("feedback",""),
                    "trace":values.get("trace",[])

                }

            )
    return {
        "event":event,
        "final_answer":final_state["draft"],
        "final_decision":final_state["decision"],
        "final_feedback":final_state["feedback"],
        "revision_count":final_state["revision_count"],
        "blocked": final_state.get(
            "blocked",
            False
        )
    }

def run_system(question):
    result=run1(question)

    for event in result["event"]:
        print(f"---{event["agent"].upper}----")
        if event["agent"] in {"planner","reviser"}:
           print(f"draft:{event["draft"]}")
        if event["agent"]=="review":
            print(f"decision:{event["decision"]}")
            print(f"feedback:{event["feedback"]}or no changes required")

    print("====FINAL ANSWER===")
    print(f"result:{result["final_answer"]}")
    print(f"decision:{result["final_decision"]}")
    print(f"revision_count:{result["revision_count"]}")

if __name__ =="__main__":
    user_prompt=input("enter the question:")
    run_system(user_prompt)