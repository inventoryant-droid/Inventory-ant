import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = 'Return JSON ONLY as an object with an "items" array: {"items": [{"productId":"1","name":"test","qty":1,"mrp":"10"}]}';
    
    console.log('Key:', process.env.OPENAI_API_KEY ? 'Loaded' : 'Missing');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    console.log(response.choices[0].message.content);
  } catch(e) {
    console.error('Error:', e);
  }
}

test();
