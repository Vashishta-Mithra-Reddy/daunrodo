// Example usage in a component or test file
// lib/test-client.ts
export async function testReelAPI(url: string) {
  try {
    const response = await fetch('/api/instagram/reel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      return null;
    }

    const data = await response.json();
    console.log('Success:', data);
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    return null;
  }
}