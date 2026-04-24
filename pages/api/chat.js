export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { messages, systemPrompt } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt || '你是陆绍桓' },
          ...messages
        ],
      }),
    });
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: '服务暂时不可用' });
  }
}