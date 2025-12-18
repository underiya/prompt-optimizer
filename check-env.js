require('dotenv').config({ path: '.env.local' });

console.log("Testing .env.local loading:");
console.log("GOOGLE_KEY exists:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
console.log("OPENAI_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("GOOGLE_KEY length:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length);
