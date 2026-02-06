# Overview

This is a project that help analyzing an email and return a reply using AI. The main goal is to facilitate the customer services job. This software is also focus on customer service in the app graphiteConnect, as supplier onboarding platform. 

This Web App needs the email thread as input. Then, it analyze the email thread and display specific information that is editable. Finally, the web app reply according to the inputs and the email thread a ready-to-send support email. 

To test a server on your local computer you should run FastAPI and also React (npm run dev). The backend is also displayed in Swagger. The frontend can be found usually in localhost:3000/analyzer. In case you want to test just the replier agent, it can be found in localhost:3000 only. 

The purpose of writing this software is to help graphiteConnect support agents to expedite the resolutions of the support tickets/cases. 

[Software Demo Video](https://www.youtube.com/watch?v=-ibJjDixeyA)

# Web Pages

{Describe each of the web pages you created and how the web app transitions between each of them.  Also describe what is dynamically created on each page.}

I have 2 webpages, the first one is just a replier that needs the email thread, case key, and the problem description. 

The second page (localhost:3000/analyzer) is an analyzer and also replier based on the analyzed information. In the analyzer webpage, it analize the case and dinamically display the information from a json where I store the analyze data.

# Development Environment

The tools to develop de software are:
- FastAPI
- Node.js / React
- Supabase
- Openai
Languagues:
- Python (backend)
- TypeScript (frontend)
- JavaScript (frontend)
# Useful Websites

* [Typescript](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
* [Openai](https://openai.com/es-419/)

# Future Work

* Implement login and save tokens in database
* Enhance translation feature in the frontend
* Improve the prompts and case key logarithms to give a better email response