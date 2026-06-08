import { DailyCurriculum, CustomLeaderboardEntry } from "../types";

export const CURRICULUM: DailyCurriculum[] = [
  {
    day: 1,
    title: "What Is Product Discovery?",
    reading: `Most people think product management is about building features.
It is not.
Building comes later.
The first responsibility of a product manager is deciding what should be built.

Product Discovery is the process of identifying customer problems, understanding business goals, evaluating opportunities, and deciding which solutions are worth investing in.
Many companies fail because they build products nobody wants.
Discovery exists to prevent that mistake.
Think of Discovery as reducing uncertainty before spending money, time, and engineering effort.

A good PM does not ask:
"What should we build?"
A good PM asks:
"What problem is worth solving?"

The purpose of Discovery is finding the intersection of:
- User Needs
- Business Goals
- Technical Feasibility
When these three overlap, product opportunities emerge.`,
    example: `Airbnb did not start by building hundreds of features.
They first discovered a simple problem:
People needed affordable accommodation during conferences.
That insight became a billion-dollar company.`,
    assignmentPrompt: `Explain Product Discovery using Airbnb as an example. Show how user needs, business goals, and technology came together.`
  },
  {
    day: 2,
    title: "Why Products Fail",
    reading: `Most products fail before they launch.
The reason is rarely bad coding.
The reason is usually bad assumptions.

Teams assume:
- Users want this
- Customers will pay
- The market is ready
- This feature is important
Then they spend months building.
Only after launch do they learn nobody cares.

Discovery helps us test assumptions before development.
Product failure is often a discovery failure.
Your job is not to prove your idea right.
Your job is to discover whether your idea is wrong.
The fastest way to save money is finding bad ideas early.`,
    example: `Google launches hundreds of experiments every year.
Many never become products because validation happens before large investment.`,
    assignmentPrompt: `Analyze why Google Plus failed using Product Discovery principles.`
  },
  {
    day: 3,
    title: "Output vs Outcome",
    reading: `Many teams celebrate launching features.
Users don't care about features.
Users care about outcomes.

- Output: "We launched dark mode."
- Outcome: "User engagement increased by 12%."

- Output: "We added AI."
- Outcome: "Support tickets reduced by 35%."

PMs are responsible for outcomes.
A feature without impact is waste.
Always ask:
"What business or customer behavior should change because of this feature?"`,
    example: `Instagram Stories wasn't successful because it existed.
It was successful because engagement increased.`,
    assignmentPrompt: `Give 10 examples where a feature is the output and business impact is the outcome.`
  },
  {
    day: 4,
    title: "Understanding Problems Before Solutions",
    reading: `The biggest mistake in Product Discovery:
Jumping to solutions.

Problem: Users are not signing up.
- Bad PM: Let's redesign the page.
- Good PM: Why are users not signing up?

Possible reasons:
- Trust issue
- Wrong audience
- Slow website
- Poor value proposition
- Language barrier

Notice:
Same problem. Five different root causes.
Never prescribe medicine before diagnosis.`,
    example: `Doctors diagnose before treatment. PMs should do the same.`,
    assignmentPrompt: `Generate 20 possible reasons why a job portal has low signup conversion.`
  },
  {
    day: 5,
    title: "User Empathy",
    reading: `A PM's superpower is empathy.
Empathy means understanding:
- What users think
- What users feel
- What users do
- What users struggle with

Products fail when teams design for themselves.
Products succeed when teams design for users.
Empathy is built through observation, not imagination.
The best PMs spend time talking to customers every week.`,
    example: `Designing interface layouts based on actual customer eye-tracking studies rather than designer preference.`,
    assignmentPrompt: `Create a detailed empathy map for a first-time online shopper.`
  },
  {
    day: 6,
    title: "Customer Interviews",
    reading: `Many people think customer interviews are about asking users what features they want.
That is wrong.
Customers are experts in their problems.
They are not experts in designing solutions.

The purpose of customer interviews is to understand:
- Behaviors
- Frustrations
- Motivations
- Workarounds

A great PM listens more than they speak.
- Bad Question: "Would you like an AI feature?"
- Good Question: "Tell me about the last time you faced this problem."

Focus on facts. Not opinions.
Past behavior predicts future behavior better than hypothetical answers.`,
    example: `Instead of asking users if they wanted Uber, the founders studied how difficult it was to get taxis.`,
    assignmentPrompt: `Create 20 customer interview questions for understanding why users abandon online shopping carts.`
  },
  {
    day: 7,
    title: "User Personas",
    reading: `After talking to users, you will collect a lot of information.
The challenge is organizing it.
This is where personas help.

A persona is a representation of a group of users with similar goals and behaviors.
Personas help teams stay focused on real users.
A good persona includes:
- Demographics
- Goals
- Pain Points
- Motivations
- Behaviors

Never create personas based on assumptions.
Create them from research.`,
    example: `Spotify may have different personas:
- Casual Listener
- Music Enthusiast
- Podcast Consumer
Each has different needs.`,
    assignmentPrompt: `Create a detailed persona for a working professional preparing for Product Manager interviews.`
  },
  {
    day: 8,
    title: "Jobs To Be Done (JTBD)",
    reading: `People do not buy products.
People hire products to make progress.
This idea is called Jobs To Be Done.

Customers hire products to achieve something.
Nobody buys a drill because they want a drill.
They buy a drill because they want a hole.
Focus on the outcome. Not the product.

A PM must understand:
"What job is the customer trying to get done?"`,
    example: `People don't use Netflix to watch movies.
They hire Netflix to avoid boredom and enjoy entertainment.`,
    assignmentPrompt: `Generate JTBD statements for users of LinkedIn.`
  },
  {
    day: 9,
    title: "Customer Journey Mapping",
    reading: `A journey map shows every step users take while interacting with your product.
Most problems happen between steps.
Not within steps.

A journey map helps uncover:
- Friction
- Delays
- Confusion
- Drop-offs

PMs use journey maps to identify opportunities.`,
    example: `Food delivery journey:
Browse -> Select -> Order -> Payment -> Delivery -> Feedback
Each stage contains opportunities.`,
    assignmentPrompt: `Create a customer journey map for ordering food using Swiggy.`
  },
  {
    day: 10,
    title: "Market Research",
    reading: `Users are important.
Markets are important too.
A great idea in a bad market can still fail.

Market research helps answer:
- Is demand growing?
- Who are competitors?
- What trends exist?
- What opportunities exist?

Market understanding improves decision making.`,
    example: `AI products grew because market demand increased dramatically.`,
    assignmentPrompt: `Conduct market research for AI-powered learning platforms in India.`
  },
  {
    day: 11,
    title: "Competitor Analysis",
    reading: `Never copy competitors.
Learn from competitors.

Competitors reveal:
- Customer expectations
- Industry standards
- Market gaps

Study:
- Features
- Positioning
- Pricing
- Strengths
- Weaknesses

The goal is not imitation.
The goal is differentiation.`,
    example: `Instagram copied Stories. Then improved distribution and engagement.`,
    assignmentPrompt: `Create a competitor analysis of LinkedIn, Naukri, and Indeed.`
  },
  {
    day: 12,
    title: "Opportunity Discovery",
    reading: `Problems create opportunities.
Discovery is not finding ideas.
Discovery is finding opportunities.

The bigger the pain, the bigger the opportunity.
PMs should ask:
- What problem exists?
- How often does it occur?
- How painful is it?
- How many users face it?`,
    example: `UPI solved payment friction. That friction became a massive opportunity.`,
    assignmentPrompt: `Identify the top 10 opportunities in online education.`
  },
  {
    day: 13,
    title: "Opportunity Solution Tree",
    reading: `Many teams jump directly to solutions.
Strong PMs connect:
Outcome -> Opportunity -> Solution
This is called an Opportunity Solution Tree.

Start with the outcome.
Then identify opportunities.
Then brainstorm solutions.`,
    example: `- Outcome: Increase retention
- Opportunity: Users forget to return
- Solution: Reminder notifications`,
    assignmentPrompt: `Create an Opportunity Solution Tree for increasing LinkedIn engagement.`
  },
  {
    day: 14,
    title: "Hypothesis Creation",
    reading: `Every product idea is an assumption.
A hypothesis converts assumptions into something testable.

Format:
We believe that...
For...
Will result in...
We will know this is true when...`,
    example: `We believe improving onboarding will increase activation.`,
    assignmentPrompt: `Generate 10 product hypotheses for improving Amazon reviews.`
  },
  {
    day: 15,
    title: "Validation Techniques",
    reading: `Validation prevents waste.
Before building: Validate.

Methods include:
- Surveys
- Interviews
- Landing Pages
- Fake Door Tests
- Concierge MVPs
- Prototypes

The goal is learning.
Not proving yourself right.`,
    example: `Dropbox validated demand using a video before building the product.`,
    assignmentPrompt: `Design a validation strategy for an AI career coaching platform.`
  },
  {
    day: 16,
    title: "Prototyping",
    reading: `A prototype is a learning tool.
Not a final product.
Prototypes help test ideas quickly.

Benefits:
- Cheap
- Fast
- Easy to change

Build to learn. Not to impress.`,
    example: `Figma prototypes reduce engineering risk.`,
    assignmentPrompt: `Create a prototype plan for a habit-tracking app.`
  },
  {
    day: 17,
    title: "Experiment Design",
    reading: `Product discovery is experimentation.
Every experiment should answer a question.

A good experiment contains:
- Goal
- Hypothesis
- Metric
- Success Criteria

No metric. No experiment.`,
    example: `Netflix continuously tests thumbnails.`,
    assignmentPrompt: `Design an A/B experiment to improve signup conversion.`
  },
  {
    day: 18,
    title: "Prioritization",
    reading: `You cannot build everything.
Resources are limited.
Prioritization determines where to focus.

Common approaches:
- Impact vs Effort
- MoSCoW
- Kano

Good PMs focus on high-impact opportunities.`,
    example: `Google kills projects regularly to focus resources.`,
    assignmentPrompt: `Prioritize 15 product ideas using Impact vs Effort.`
  },
  {
    day: 19,
    title: "Success Metrics",
    reading: `If you cannot measure success, you cannot improve success.
Metrics help evaluate outcomes.

Examples:
- Retention
- Revenue
- Conversion
- Engagement
- Activation

Always define success before building.`,
    example: `Facebook discovered users with 7 friends in 10 days were more likely to stay. That became an activation metric.`,
    assignmentPrompt: `Design a success metric framework for LinkedIn.`
  },
  {
    day: 20,
    title: "Product Roadmaps",
    reading: `Roadmaps communicate direction.
A roadmap is not a feature list.
A roadmap is a sequence of problems to solve.

Roadmaps align:
- Business
- Product
- Engineering

Good roadmaps focus on outcomes. Not tasks.`,
    example: `Spotify roadmaps focus on user engagement goals.`,
    assignmentPrompt: `Create a 6-month roadmap for improving LinkedIn job applications.`
  },
  {
    day: 21,
    title: "Continuous Product Discovery",
    reading: `Discovery is never finished.
Customer needs change.
Markets change.
Technology changes.
The best PMs continuously learn.

Continuous Discovery means:
- Weekly interviews
- Weekly experiments
- Weekly prototype testing
- Continuous feedback collection

Discovery becomes a habit. Not a project.`,
    example: `Top product teams talk to customers every week rather than once a quarter. This aligns with Teresa Torres' continuous discovery model.`,
    assignmentPrompt: `Create a weekly Continuous Product Discovery plan for LinkedIn.`
  }
];

export const MOCK_LEADERBOARD: CustomLeaderboardEntry[] = [
  { id: "lead_1", name: "Ananya Sharma", streak: 21, totalScore: 320, daysCompleted: 21 },
  { id: "lead_2", name: "Rahul Verma", streak: 19, totalScore: 290, daysCompleted: 20 },
  { id: "lead_3", name: "Priyanka Sen", streak: 17, totalScore: 275, daysCompleted: 18 },
  { id: "lead_4", name: "Vikram Malhotra", streak: 15, totalScore: 245, daysCompleted: 16 },
  { id: "lead_5", name: "Siddharth Rao", streak: 12, totalScore: 190, daysCompleted: 14 }
];
