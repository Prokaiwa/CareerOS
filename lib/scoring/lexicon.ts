/**
 * Curated skill lexicon for the Career Match Engine.
 *
 * ~200 well-known hard skills across software, data, product, design,
 * marketing, and business ops. Fully offline — this is the deterministic
 * vocabulary the engine uses to detect what a job posting asks for.
 *
 * USERS CAN EXTEND THIS FILE: add a `{ name, aliases }` entry anywhere in
 * the array below and the whole engine (skill extraction, missing-skill
 * suggestions) picks it up automatically. `name` is the canonical display
 * form; `aliases` are lowercase variants matched as whole words / phrases
 * in job text (the canonical name itself is always matched too).
 */

export type LexiconSkill = {
  name: string;
  aliases: string[];
};

export const SKILL_LEXICON: LexiconSkill[] = [
  /* ---------------- Programming languages ---------------- */
  { name: "JavaScript", aliases: ["javascript", "js"] },
  { name: "TypeScript", aliases: ["typescript", "ts"] },
  { name: "Python", aliases: ["python"] },
  { name: "Java", aliases: ["java"] },
  { name: "C#", aliases: ["c#", "csharp", "c sharp"] },
  { name: "C++", aliases: ["c++", "cpp", "cplusplus"] },
  { name: "C", aliases: [] }, // bare "c" is too ambiguous to alias-match
  { name: "Go", aliases: ["golang"] }, // bare "go" is too ambiguous
  { name: "Rust", aliases: ["rust"] },
  { name: "Ruby", aliases: ["ruby"] },
  { name: "PHP", aliases: ["php"] },
  { name: "Swift", aliases: ["swift"] },
  { name: "Kotlin", aliases: ["kotlin"] },
  { name: "Scala", aliases: ["scala"] },
  { name: "R", aliases: ["r language", "rlang", "r programming"] },
  { name: "Objective-C", aliases: ["objective-c", "objective c", "objc"] },
  { name: "Dart", aliases: ["dart"] },
  { name: "Elixir", aliases: ["elixir"] },
  { name: "Haskell", aliases: ["haskell"] },
  { name: "Perl", aliases: ["perl"] },
  { name: "Lua", aliases: ["lua"] },
  { name: "MATLAB", aliases: ["matlab"] },
  { name: "Bash", aliases: ["bash", "shell scripting", "shell script"] },
  { name: "SQL", aliases: ["sql"] },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Solidity", aliases: ["solidity"] },

  /* ---------------- Frontend / frameworks ---------------- */
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", aliases: ["next.js", "nextjs"] },
  { name: "Vue.js", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Nuxt", aliases: ["nuxt", "nuxt.js", "nuxtjs"] },
  { name: "Angular", aliases: ["angular", "angularjs"] },
  { name: "Svelte", aliases: ["svelte", "sveltekit"] },
  { name: "React Native", aliases: ["react native"] },
  { name: "Flutter", aliases: ["flutter"] },
  { name: "jQuery", aliases: ["jquery"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Sass", aliases: ["sass", "scss"] },
  { name: "Redux", aliases: ["redux"] },
  { name: "Webpack", aliases: ["webpack"] },
  { name: "Vite", aliases: ["vite"] },
  { name: "Storybook", aliases: ["storybook"] },
  { name: "Electron", aliases: ["electron"] },
  { name: "Three.js", aliases: ["three.js", "threejs"] },
  { name: "WebGL", aliases: ["webgl"] },
  { name: "Accessibility", aliases: ["accessibility", "a11y", "wcag"] },

  /* ---------------- Backend / frameworks ---------------- */
  { name: "Node.js", aliases: ["node.js", "nodejs", "node"] },
  { name: "Express", aliases: ["express", "express.js", "expressjs"] },
  { name: "NestJS", aliases: ["nestjs", "nest.js"] },
  { name: "Django", aliases: ["django"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "FastAPI", aliases: ["fastapi", "fast api"] },
  { name: "Ruby on Rails", aliases: ["rails", "ruby on rails"] },
  { name: "Spring", aliases: ["spring", "spring boot", "springboot"] },
  { name: ".NET", aliases: [".net", "dotnet", "asp.net", "aspnet"] },
  { name: "Laravel", aliases: ["laravel"] },
  { name: "GraphQL", aliases: ["graphql"] },
  { name: "REST APIs", aliases: ["rest", "rest api", "rest apis", "restful"] },
  { name: "gRPC", aliases: ["grpc"] },
  { name: "WebSockets", aliases: ["websocket", "websockets"] },
  { name: "Microservices", aliases: ["microservices", "micro services", "microservice"] },
  { name: "Serverless", aliases: ["serverless", "lambda functions"] },
  { name: "OAuth", aliases: ["oauth", "oauth2", "oauth 2.0"] },

  /* ---------------- Databases / data stores ---------------- */
  { name: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { name: "MySQL", aliases: ["mysql"] },
  { name: "SQLite", aliases: ["sqlite"] },
  { name: "SQL Server", aliases: ["sql server", "mssql", "microsoft sql server"] },
  { name: "Oracle", aliases: ["oracle", "oracle db", "pl/sql", "plsql"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo"] },
  { name: "Redis", aliases: ["redis"] },
  { name: "Elasticsearch", aliases: ["elasticsearch", "elastic search", "opensearch"] },
  { name: "Cassandra", aliases: ["cassandra"] },
  { name: "DynamoDB", aliases: ["dynamodb", "dynamo db"] },
  { name: "Neo4j", aliases: ["neo4j"] },
  { name: "Snowflake", aliases: ["snowflake"] },
  { name: "BigQuery", aliases: ["bigquery", "big query"] },
  { name: "Redshift", aliases: ["redshift"] },
  { name: "Databricks", aliases: ["databricks"] },
  { name: "Supabase", aliases: ["supabase"] },
  { name: "Firebase", aliases: ["firebase", "firestore"] },

  /* ---------------- Cloud / DevOps / infra ---------------- */
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Azure", aliases: ["azure", "microsoft azure"] },
  { name: "Google Cloud", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { name: "Docker", aliases: ["docker", "containers", "containerization"] },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Terraform", aliases: ["terraform"] },
  { name: "Ansible", aliases: ["ansible"] },
  { name: "Pulumi", aliases: ["pulumi"] },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"] },
  { name: "Jenkins", aliases: ["jenkins"] },
  { name: "GitHub Actions", aliases: ["github actions"] },
  { name: "GitLab CI", aliases: ["gitlab ci", "gitlab"] },
  { name: "Git", aliases: ["git", "version control"] },
  { name: "Linux", aliases: ["linux", "unix"] },
  { name: "Nginx", aliases: ["nginx"] },
  { name: "Kafka", aliases: ["kafka", "apache kafka"] },
  { name: "RabbitMQ", aliases: ["rabbitmq", "rabbit mq"] },
  { name: "Helm", aliases: ["helm"] },
  { name: "Prometheus", aliases: ["prometheus"] },
  { name: "Grafana", aliases: ["grafana"] },
  { name: "Datadog", aliases: ["datadog"] },
  { name: "New Relic", aliases: ["new relic", "newrelic"] },
  { name: "Splunk", aliases: ["splunk"] },
  { name: "Observability", aliases: ["observability", "monitoring and alerting"] },
  { name: "Site Reliability Engineering", aliases: ["sre", "site reliability"] },
  { name: "Infrastructure as Code", aliases: ["infrastructure as code", "iac"] },
  { name: "Cloudflare", aliases: ["cloudflare"] },
  { name: "Vercel", aliases: ["vercel"] },
  { name: "Heroku", aliases: ["heroku"] },

  /* ---------------- Data / ML / analytics ---------------- */
  { name: "Machine Learning", aliases: ["machine learning", "ml engineering"] },
  { name: "Deep Learning", aliases: ["deep learning", "neural networks"] },
  { name: "Natural Language Processing", aliases: ["nlp", "natural language processing"] },
  { name: "Computer Vision", aliases: ["computer vision"] },
  { name: "TensorFlow", aliases: ["tensorflow"] },
  { name: "PyTorch", aliases: ["pytorch"] },
  { name: "scikit-learn", aliases: ["scikit-learn", "scikit learn", "sklearn"] },
  { name: "Pandas", aliases: ["pandas"] },
  { name: "NumPy", aliases: ["numpy"] },
  { name: "Spark", aliases: ["spark", "apache spark", "pyspark"] },
  { name: "Hadoop", aliases: ["hadoop"] },
  { name: "Airflow", aliases: ["airflow", "apache airflow"] },
  { name: "dbt", aliases: ["dbt"] },
  { name: "ETL", aliases: ["etl", "elt", "data pipelines", "data pipeline"] },
  { name: "Data Warehousing", aliases: ["data warehouse", "data warehousing"] },
  { name: "Data Modeling", aliases: ["data modeling", "data modelling"] },
  { name: "Data Engineering", aliases: ["data engineering"] },
  { name: "Data Analysis", aliases: ["data analysis", "data analytics"] },
  { name: "Data Visualization", aliases: ["data visualization", "data visualisation", "dataviz"] },
  { name: "Statistics", aliases: ["statistics", "statistical analysis", "statistical modeling"] },
  { name: "A/B Testing", aliases: ["a/b testing", "ab testing", "a/b tests", "experimentation"] },
  { name: "Power BI", aliases: ["power bi", "powerbi"] },
  { name: "Tableau", aliases: ["tableau"] },
  { name: "Looker", aliases: ["looker", "lookml"] },
  { name: "Excel", aliases: ["excel", "microsoft excel", "spreadsheets", "vlookup", "pivot tables"] },
  { name: "Google Analytics", aliases: ["google analytics", "ga4"] },
  { name: "Mixpanel", aliases: ["mixpanel"] },
  { name: "Amplitude", aliases: ["amplitude"] },
  { name: "Segment", aliases: ["segment"] },
  { name: "LLMs", aliases: ["llm", "llms", "large language models", "generative ai", "genai", "prompt engineering"] },
  { name: "RAG", aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation"] },
  { name: "MLOps", aliases: ["mlops", "ml ops"] },

  /* ---------------- Mobile ---------------- */
  { name: "iOS", aliases: ["ios", "ios development", "swiftui", "uikit"] },
  { name: "Android", aliases: ["android", "android development", "jetpack compose"] },

  /* ---------------- Testing / quality ---------------- */
  { name: "Unit Testing", aliases: ["unit testing", "unit tests"] },
  { name: "Test Automation", aliases: ["test automation", "automated testing", "qa automation"] },
  { name: "Jest", aliases: ["jest"] },
  { name: "Cypress", aliases: ["cypress"] },
  { name: "Playwright", aliases: ["playwright"] },
  { name: "Selenium", aliases: ["selenium"] },
  { name: "TDD", aliases: ["tdd", "test-driven development", "test driven development"] },

  /* ---------------- Architecture / practices ---------------- */
  { name: "System Design", aliases: ["system design", "systems design"] },
  { name: "Distributed Systems", aliases: ["distributed systems", "distributed computing"] },
  { name: "Event-Driven Architecture", aliases: ["event-driven", "event driven architecture", "event sourcing"] },
  { name: "Domain-Driven Design", aliases: ["domain-driven design", "domain driven design", "ddd"] },
  { name: "Performance Optimization", aliases: ["performance optimization", "performance tuning"] },
  { name: "Security", aliases: ["application security", "appsec", "security engineering", "penetration testing", "owasp"] },
  { name: "Cryptography", aliases: ["cryptography", "encryption"] },
  { name: "Networking", aliases: ["tcp/ip", "network engineering", "dns", "load balancing"] },
  { name: "Agile", aliases: ["agile", "scrum", "kanban"] },
  { name: "Code Review", aliases: ["code review", "code reviews"] },
  { name: "Technical Writing", aliases: ["technical writing", "technical documentation"] },
  { name: "API Design", aliases: ["api design", "api development"] },

  /* ---------------- Product management ---------------- */
  { name: "Product Management", aliases: ["product management", "product manager"] },
  { name: "Product Strategy", aliases: ["product strategy"] },
  { name: "Roadmapping", aliases: ["roadmap", "roadmapping", "product roadmap"] },
  { name: "User Research", aliases: ["user research", "customer research", "user interviews"] },
  { name: "Product Analytics", aliases: ["product analytics"] },
  { name: "Stakeholder Management", aliases: ["stakeholder management"] },
  { name: "Requirements Gathering", aliases: ["requirements gathering", "prd", "product requirements"] },
  { name: "Go-to-Market", aliases: ["go-to-market", "go to market", "gtm"] },
  { name: "OKRs", aliases: ["okr", "okrs"] },
  { name: "Jira", aliases: ["jira"] },
  { name: "Confluence", aliases: ["confluence"] },
  { name: "Asana", aliases: ["asana"] },
  { name: "Trello", aliases: ["trello"] },
  { name: "Notion", aliases: ["notion"] },
  { name: "Linear", aliases: ["linear"] },

  /* ---------------- Design ---------------- */
  { name: "Figma", aliases: ["figma"] },
  { name: "Sketch", aliases: ["sketch"] },
  { name: "Adobe XD", aliases: ["adobe xd"] },
  { name: "Photoshop", aliases: ["photoshop", "adobe photoshop"] },
  { name: "Illustrator", aliases: ["illustrator", "adobe illustrator"] },
  { name: "After Effects", aliases: ["after effects"] },
  { name: "UX Design", aliases: ["ux", "ux design", "user experience design", "user experience"] },
  { name: "UI Design", aliases: ["ui design", "user interface design", "visual design"] },
  { name: "Interaction Design", aliases: ["interaction design", "ixd"] },
  { name: "Prototyping", aliases: ["prototyping", "prototypes", "wireframing", "wireframes"] },
  { name: "Design Systems", aliases: ["design system", "design systems"] },
  { name: "Usability Testing", aliases: ["usability testing", "usability tests"] },
  { name: "Motion Design", aliases: ["motion design", "motion graphics"] },
  { name: "Branding", aliases: ["branding", "brand design", "brand identity"] },

  /* ---------------- Marketing / growth ---------------- */
  { name: "SEO", aliases: ["seo", "search engine optimization"] },
  { name: "SEM", aliases: ["sem", "search engine marketing", "paid search"] },
  { name: "Content Marketing", aliases: ["content marketing", "content strategy"] },
  { name: "Email Marketing", aliases: ["email marketing", "email campaigns"] },
  { name: "Social Media Marketing", aliases: ["social media marketing", "social media management"] },
  { name: "Google Ads", aliases: ["google ads", "adwords", "google adwords"] },
  { name: "Meta Ads", aliases: ["facebook ads", "meta ads", "instagram ads"] },
  { name: "Copywriting", aliases: ["copywriting", "copywriter"] },
  { name: "Marketing Automation", aliases: ["marketing automation"] },
  { name: "HubSpot", aliases: ["hubspot"] },
  { name: "Marketo", aliases: ["marketo"] },
  { name: "Mailchimp", aliases: ["mailchimp"] },
  { name: "CRM", aliases: ["crm", "customer relationship management"] },
  { name: "Salesforce", aliases: ["salesforce"] },
  { name: "Growth Marketing", aliases: ["growth marketing", "growth hacking"] },
  { name: "Conversion Rate Optimization", aliases: ["conversion rate optimization", "cro", "conversion optimization"] },
  { name: "Brand Marketing", aliases: ["brand marketing"] },
  { name: "PR", aliases: ["public relations", "media relations"] },
  { name: "Influencer Marketing", aliases: ["influencer marketing"] },
  { name: "Affiliate Marketing", aliases: ["affiliate marketing"] },

  /* ---------------- Business ops / finance / sales ---------------- */
  { name: "Project Management", aliases: ["project management", "pmp"] },
  { name: "Program Management", aliases: ["program management"] },
  { name: "Operations Management", aliases: ["operations management", "business operations", "bizops"] },
  { name: "Supply Chain", aliases: ["supply chain", "supply chain management", "logistics"] },
  { name: "Procurement", aliases: ["procurement", "sourcing", "vendor management"] },
  { name: "Financial Modeling", aliases: ["financial modeling", "financial modelling", "financial analysis"] },
  { name: "Forecasting", aliases: ["forecasting", "budgeting", "fp&a"] },
  { name: "Accounting", aliases: ["accounting", "bookkeeping", "gaap"] },
  { name: "QuickBooks", aliases: ["quickbooks"] },
  { name: "SAP", aliases: ["sap"] },
  { name: "NetSuite", aliases: ["netsuite"] },
  { name: "ERP", aliases: ["erp", "enterprise resource planning"] },
  { name: "Business Intelligence", aliases: ["business intelligence", "bi tools"] },
  { name: "Business Development", aliases: ["business development", "partnerships"] },
  { name: "Sales", aliases: ["sales strategy", "b2b sales", "saas sales", "inside sales", "enterprise sales"] },
  { name: "Account Management", aliases: ["account management", "customer success", "client management"] },
  { name: "Negotiation", aliases: ["negotiation", "contract negotiation"] },
  { name: "Recruiting", aliases: ["recruiting", "talent acquisition", "sourcing candidates"] },
  { name: "Customer Support", aliases: ["customer support", "customer service", "zendesk", "intercom"] },
  { name: "Data Entry", aliases: ["data entry"] },
  { name: "Compliance", aliases: ["compliance", "regulatory compliance", "gdpr", "hipaa", "sox", "soc 2", "soc2"] },
  { name: "Risk Management", aliases: ["risk management", "risk assessment"] },
  { name: "Slack", aliases: ["slack"] },
  { name: "Microsoft Office", aliases: ["microsoft office", "ms office", "powerpoint", "microsoft word"] },
  { name: "Google Workspace", aliases: ["google workspace", "g suite", "google sheets", "google docs"] },
  { name: "Shopify", aliases: ["shopify"] },
  { name: "WordPress", aliases: ["wordpress"] },
  { name: "Webflow", aliases: ["webflow"] },
  { name: "Zapier", aliases: ["zapier"] },
  { name: "Airtable", aliases: ["airtable"] },
];

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

/**
 * Escape regex metacharacters in an alias so tokens like "c#", "c++",
 * "ci/cd", ".net", "node.js" match literally.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Build one regex per lexicon entry that matches any of its aliases (or the
 * canonical name) as a whole word / phrase. Standard `\b` fails around
 * non-word characters (`c#`, `.net`, `c++`), so we use explicit lookaround
 * on "not a letter/digit" instead of word boundaries.
 */
type CompiledEntry = { name: string; regex: RegExp };

const BOUNDARY_START = "(?<![a-z0-9+#.])";
const BOUNDARY_END = "(?![a-z0-9+#])";

const COMPILED: CompiledEntry[] = SKILL_LEXICON.map((entry) => {
  const variants = [entry.name.toLowerCase(), ...entry.aliases.map((a) => a.toLowerCase())]
    // Longest first so "power bi" wins over any shorter overlapping variant.
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  const pattern = `${BOUNDARY_START}(?:${variants.join("|")})${BOUNDARY_END}`;
  return { name: entry.name, regex: new RegExp(pattern, "i") };
});

/**
 * Returns the canonical names of all lexicon skills found in `text`.
 * Matching is case-insensitive, whole-word/phrase based, and tolerant of
 * punctuation-bearing skills ("node.js", "c#", "ci/cd", "power bi").
 * Order of results follows lexicon order (deterministic).
 */
export function findLexiconSkills(text: string): string[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const found: string[] = [];
  for (const { name, regex } of COMPILED) {
    if (regex.test(haystack)) found.push(name);
  }
  return found;
}
